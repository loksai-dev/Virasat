"""Bi-temporal edge management for Virasat.

Non-negotiable rule 4:
Bi-temporal edges (Relationship, Nominee, Owns) are never overwritten or hard-deleted.
Close the old row (recorded_to = now, valid_to = effective date) and insert a new one.
'Still true' sentinel = 9999-12-31T23:59:59Z.

Timestamps are generated in the application (UTC, microsecond precision).
"""

from datetime import UTC, datetime
from typing import Any

from google.cloud import spanner
from google.cloud.spanner_v1.transaction import Transaction

SENTINEL_MAX_TIMESTAMP = datetime(9999, 12, 31, 23, 59, 59, tzinfo=UTC)


def now_utc() -> datetime:
    """Return current UTC datetime with microsecond precision."""
    return datetime.now(UTC)


def as_of_clause(
    valid_at: datetime | None = None,
    known_at: datetime | None = None,
    prefix: str = "",
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    """Generate SQL WHERE condition and parameters for bi-temporal as-of querying.

    Condition:
    valid_from <= valid_at < valid_to AND recorded_from <= known_at < recorded_to
    """
    v_at = valid_at if valid_at is not None else now_utc()
    k_at = known_at if known_at is not None else now_utc()

    col_prefix = f"{prefix}." if prefix and not prefix.endswith(".") else prefix

    clause = (
        f"{col_prefix}valid_from <= @valid_at AND @valid_at < {col_prefix}valid_to AND "
        f"{col_prefix}recorded_from <= @known_at AND @known_at < {col_prefix}recorded_to"
    )

    params = {
        "valid_at": v_at,
        "known_at": k_at,
    }

    param_types = {
        "valid_at": spanner.param_types.TIMESTAMP,
        "known_at": spanner.param_types.TIMESTAMP,
    }

    return clause, params, param_types


def close_edge(
    transaction: Transaction,
    table: str,
    key_filter: dict[str, Any],
    valid_to: datetime,
    recorded_to: datetime,
) -> int:
    """Close an active bi-temporal edge row (mark recorded_to = now, valid_to = effective date).

    Does not overwrite or delete. Sets recorded_to to close Virasat's knowledge of the edge,
    and valid_to to close its validity in the real world.
    """
    where_parts = []
    params: dict[str, Any] = {
        "new_valid_to": valid_to,
        "new_recorded_to": recorded_to,
        "sentinel": SENTINEL_MAX_TIMESTAMP,
    }
    param_types: dict[str, Any] = {
        "new_valid_to": spanner.param_types.TIMESTAMP,
        "new_recorded_to": spanner.param_types.TIMESTAMP,
        "sentinel": spanner.param_types.TIMESTAMP,
    }

    for k, v in key_filter.items():
        param_name = f"k_{k}"
        where_parts.append(f"{k} = @{param_name}")
        params[param_name] = v
        if isinstance(v, str):
            param_types[param_name] = spanner.param_types.STRING
        elif isinstance(v, (int, float)):
            param_types[param_name] = spanner.param_types.FLOAT64
        elif isinstance(v, datetime):
            param_types[param_name] = spanner.param_types.TIMESTAMP

    # Only close edges that are currently open in recorded time (recorded_to == sentinel)
    where_parts.append("recorded_to = @sentinel")

    sql = (
        f"UPDATE {table} SET valid_to = @new_valid_to, recorded_to = @new_recorded_to "
        f"WHERE {' AND '.join(where_parts)}"
    )

    return transaction.execute_update(sql, params=params, param_types=param_types)


def insert_edge(
    transaction: Transaction,
    table: str,
    row_dict: dict[str, Any],
    valid_from: datetime | None = None,
    valid_to: datetime | None = None,
    recorded_from: datetime | None = None,
    recorded_to: datetime | None = None,
) -> None:
    """Insert a new bi-temporal edge row."""
    now = now_utc()
    row = dict(row_dict)
    row["valid_from"] = valid_from if valid_from is not None else now
    row["valid_to"] = valid_to if valid_to is not None else SENTINEL_MAX_TIMESTAMP
    row["recorded_from"] = recorded_from if recorded_from is not None else now
    row["recorded_to"] = recorded_to if recorded_to is not None else SENTINEL_MAX_TIMESTAMP

    columns = list(row.keys())
    values = [f"@{c}" for c in columns]
    params: dict[str, Any] = {}
    param_types: dict[str, Any] = {}

    for c, val in row.items():
        params[c] = val
        if isinstance(val, str):
            param_types[c] = spanner.param_types.STRING
        elif isinstance(val, int):
            param_types[c] = spanner.param_types.INT64
        elif isinstance(val, float):
            param_types[c] = spanner.param_types.FLOAT64
        elif isinstance(val, datetime):
            param_types[c] = spanner.param_types.TIMESTAMP
        elif isinstance(val, bool):
            param_types[c] = spanner.param_types.BOOL

    sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)})"
    transaction.execute_update(sql, params=params, param_types=param_types)


def supersede_edge(
    transaction: Transaction,
    table: str,
    key_filter: dict[str, Any],
    new_edge_dict: dict[str, Any],
    effective_date: datetime | None = None,
    now: datetime | None = None,
) -> None:
    """Supersede an edge: close the previous active row and insert the replacement row."""
    current_time = now if now is not None else now_utc()
    eff_date = effective_date if effective_date is not None else current_time

    # 1. Close the previous edge
    close_edge(
        transaction=transaction,
        table=table,
        key_filter=key_filter,
        valid_to=eff_date,
        recorded_to=current_time,
    )

    # 2. Insert the superseding edge
    insert_edge(
        transaction=transaction,
        table=table,
        row_dict=new_edge_dict,
        valid_from=eff_date,
        valid_to=SENTINEL_MAX_TIMESTAMP,
        recorded_from=current_time,
        recorded_to=SENTINEL_MAX_TIMESTAMP,
    )
