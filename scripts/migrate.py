#!/usr/bin/env python3
"""Cloud Spanner Database Migration Runner for Virasat.

Idempotent migration tool:
- Tracks applied migrations in the SchemaVersion table
- Applies DDL statements one by one via the Spanner Database Admin API
- Supports --reset to drop all property graphs, indexes, and tables before migrating
"""

import argparse
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import re
import sys

# Ensure backend directory is in python path to load settings
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.config import get_settings
    settings = get_settings()
    DEFAULT_PROJECT = settings.GCP_PROJECT
    DEFAULT_INSTANCE = settings.SPANNER_INSTANCE
    DEFAULT_DATABASE = settings.SPANNER_DATABASE
except Exception:
    DEFAULT_PROJECT = os.environ.get("GCP_PROJECT", "virasat-511210")
    DEFAULT_INSTANCE = os.environ.get("SPANNER_INSTANCE", "virasat-inst")
    DEFAULT_DATABASE = os.environ.get("SPANNER_DATABASE", "virasat-db")

from google.cloud import spanner

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate")


def get_migrations_dir() -> Path:
    """Find backend/app/db/migrations directory."""
    candidates = [
        ROOT_DIR / "backend" / "app" / "db" / "migrations",
        BACKEND_DIR / "app" / "db" / "migrations",
        Path.cwd() / "app" / "db" / "migrations",
        Path.cwd() / "backend" / "app" / "db" / "migrations",
    ]
    for c in candidates:
        if c.is_dir():
            return c
    raise FileNotFoundError("Could not find backend/app/db/migrations directory")


def split_sql_statements(content: str) -> list[str]:
    """Split SQL file content into individual executable statements."""
    lines = []
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        if "--" in line:
            parts = line.split("--")
            lines.append(parts[0])
        else:
            lines.append(line)

    full_text = "\n".join(lines)
    raw_statements = full_text.split(";")
    cleaned = []
    for s in raw_statements:
        stmt = s.strip()
        if stmt:
            cleaned.append(stmt)
    return cleaned


def drop_everything(client: spanner.Client, project: str, instance: str, database: str) -> None:
    """Drop all property graphs, secondary indexes, and tables in the database."""
    admin_client = client.database_admin_api
    db_path = admin_client.database_path(project, instance, database)
    spanner_db = client.instance(instance).database(database)

    logger.warning("Reset requested: Dropping all property graphs, indexes, and tables in %s...", database)

    # 1. Drop Property Graphs
    with spanner_db.snapshot() as snapshot:
        query = (
            "SELECT property_graph_name FROM information_schema.property_graphs "
            "WHERE property_graph_schema = ''"
        )
        try:
            graphs = [row[0] for row in snapshot.execute_sql(query)]
        except Exception:
            graphs = []

    for g in ["EstateGraph", "VirasatGraph", "TGraph"]:
        if g not in graphs:
            graphs.append(g)

    for graph in graphs:
        logger.info("Dropping property graph: %s", graph)
        try:
            op = admin_client.update_database_ddl(
                database=db_path,
                statements=[f"DROP PROPERTY GRAPH {graph}"],
            )
            op.result()
            logger.info("Dropped property graph %s successfully", graph)
        except Exception as e:
            if "not found" in str(e).lower():
                pass
            else:
                logger.warning("Failed to drop property graph %s: %s", graph, e)

    # 2. Drop all secondary indexes
    with spanner_db.snapshot() as snapshot:
        query = (
            "SELECT index_name FROM information_schema.indexes "
            "WHERE table_schema = '' AND index_type != 'PRIMARY_KEY'"
        )
        try:
            indexes = [row[0] for row in snapshot.execute_sql(query)]
        except Exception as e:
            logger.warning("Failed to query indexes: %s", e)
            indexes = []

    if indexes:
        logger.info("Dropping %d secondary indexes...", len(indexes))
        drop_index_stmts = [f"DROP INDEX {idx}" for idx in indexes]
        try:
            op = admin_client.update_database_ddl(database=db_path, statements=drop_index_stmts)
            op.result()
            logger.info("Dropped all secondary indexes successfully.")
        except Exception as e:
            logger.warning("Batch drop indexes failed (%s), dropping individually...", e)
            for idx in indexes:
                try:
                    op = admin_client.update_database_ddl(database=db_path, statements=[f"DROP INDEX {idx}"])
                    op.result()
                except Exception as inner_e:
                    logger.warning("Failed to drop index %s: %s", idx, inner_e)

    # 3. Drop all user tables
    with spanner_db.snapshot() as snapshot:
        query = (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = '' AND table_type = 'BASE TABLE'"
        )
        try:
            tables = [row[0] for row in snapshot.execute_sql(query)]
        except Exception as e:
            logger.error("Failed to query tables: %s", e)
            tables = []

    if tables:
        logger.info("Dropping %d tables...", len(tables))
        drop_table_stmts = [f"DROP TABLE {tbl}" for tbl in tables]
        try:
            op = admin_client.update_database_ddl(database=db_path, statements=drop_table_stmts)
            op.result()
            logger.info("Dropped all tables successfully.")
        except Exception as e:
            logger.warning("Batch drop tables failed (%s), dropping individually...", e)
            for table in tables:
                try:
                    op = admin_client.update_database_ddl(database=db_path, statements=[f"DROP TABLE {table}"])
                    op.result()
                    logger.info("Dropped table %s successfully", table)
                except Exception as inner_e:
                    logger.warning("Failed to drop table %s: %s", table, inner_e)

    logger.info("Database reset completed.")


def ensure_schema_version_table(client: spanner.Client, project: str, instance: str, database: str) -> None:
    """Ensure SchemaVersion tracking table exists."""
    spanner_db = client.instance(instance).database(database)
    admin_client = client.database_admin_api
    db_path = admin_client.database_path(project, instance, database)

    with spanner_db.snapshot() as snapshot:
        query = (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = '' AND table_name = 'SchemaVersion'"
        )
        exists = list(snapshot.execute_sql(query))

    if not exists:
        logger.info("Creating SchemaVersion table...")
        stmt = (
            "CREATE TABLE SchemaVersion (\n"
            "  version STRING(64) NOT NULL,\n"
            "  applied_at TIMESTAMP NOT NULL,\n"
            "  description STRING(256)\n"
            ") PRIMARY KEY (version)"
        )
        op = admin_client.update_database_ddl(database=db_path, statements=[stmt])
        op.result()
        logger.info("SchemaVersion table created.")


def get_applied_versions(client: spanner.Client, instance: str, database: str) -> set[str]:
    """Retrieve all migration versions already applied."""
    spanner_db = client.instance(instance).database(database)
    try:
        with spanner_db.snapshot() as snapshot:
            rows = list(snapshot.execute_sql("SELECT version FROM SchemaVersion"))
            return {r[0] for r in rows}
    except Exception:
        return set()


def record_migration(
    client: spanner.Client,
    instance: str,
    database: str,
    version: str,
    description: str,
) -> None:
    """Record successfully applied migration in SchemaVersion table."""
    spanner_db = client.instance(instance).database(database)
    now = datetime.now(timezone.utc)

    def _insert(transaction):
        transaction.execute_update(
            "INSERT INTO SchemaVersion (version, applied_at, description) "
            "VALUES (@ver, @ts, @desc)",
            params={"ver": version, "ts": now, "desc": description},
            param_types={
                "ver": spanner.param_types.STRING,
                "ts": spanner.param_types.TIMESTAMP,
                "desc": spanner.param_types.STRING,
            },
        )

    spanner_db.run_in_transaction(_insert)


def run_migrations(project: str, instance: str, database: str, reset: bool = False) -> None:
    """Execute all pending schema migrations."""
    client = spanner.Client(project=project)
    admin_client = client.database_admin_api
    db_path = admin_client.database_path(project, instance, database)

    if reset:
        drop_everything(client, project, instance, database)

    ensure_schema_version_table(client, project, instance, database)
    applied = get_applied_versions(client, instance, database)

    migrations_dir = get_migrations_dir()
    sql_files = sorted(migrations_dir.glob("*.sql"))

    if not sql_files:
        logger.warning("No migration SQL files found in %s", migrations_dir)
        return

    pending_count = 0
    for sql_file in sql_files:
        version = sql_file.name
        if version in applied:
            logger.info("Migration %s already applied (skipping)", version)
            continue

        pending_count += 1
        logger.info("Applying migration: %s", version)
        content = sql_file.read_text(encoding="utf-8")
        statements = split_sql_statements(content)
        logger.info("Found %d statements in %s", len(statements), version)

        # Apply statements one at a time, in order
        for idx, stmt in enumerate(statements, 1):
            stmt_summary = re.sub(r"\s+", " ", stmt)[:60]
            logger.info("  [%d/%d] Executing: %s...", idx, len(statements), stmt_summary)
            op = admin_client.update_database_ddl(database=db_path, statements=[stmt])
            op.result()

        record_migration(client, instance, database, version, f"Applied from {version}")
        logger.info("Successfully applied migration: %s", version)

    if pending_count == 0:
        logger.info("Database is up to date. No pending migrations.")
    else:
        logger.info("All %d pending migrations applied successfully.", pending_count)


def main():
    parser = argparse.ArgumentParser(description="Cloud Spanner Migration Tool for Virasat")
    parser.add_argument("--reset", action="store_true", help="Drop all tables and property graphs before migrating")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"GCP Project ID (default: {DEFAULT_PROJECT})")
    parser.add_argument("--instance", default=DEFAULT_INSTANCE, help=f"Spanner Instance ID (default: {DEFAULT_INSTANCE})")
    parser.add_argument("--database", default=DEFAULT_DATABASE, help=f"Spanner Database ID (default: {DEFAULT_DATABASE})")

    args = parser.parse_args()
    logger.info("Target Database: projects/%s/instances/%s/databases/%s", args.project, args.instance, args.database)
    run_migrations(project=args.project, instance=args.instance, database=args.database, reset=args.reset)


if __name__ == "__main__":
    main()
