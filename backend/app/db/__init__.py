"""Cloud Spanner database package for Virasat."""

from app.db.audit import append_audit_entry, compute_audit_hash, record_change
from app.db.bitemporal import (
    SENTINEL_MAX_TIMESTAMP,
    as_of_clause,
    close_edge,
    insert_edge,
    now_utc,
    supersede_edge,
)
from app.db.client import get_db, run_in_snapshot, run_in_transaction, snapshot_context
from app.db.graph_queries import query_graph_gql, query_graph_sql, snapshot
from app.db.repositories import (
    AssetRepo,
    AuditLogRepo,
    CasesRepo,
    ClaimRepo,
    ConsentRepo,
    DisputeRepo,
    DocumentRepo,
    InstitutionRepo,
    NomineeRepo,
    OwnsRepo,
    PersonRepo,
    RelationshipRepo,
    WillRepo,
    bump_case_version,
)

__all__ = [
    "SENTINEL_MAX_TIMESTAMP",
    "AssetRepo",
    "AuditLogRepo",
    "CasesRepo",
    "ClaimRepo",
    "ConsentRepo",
    "DisputeRepo",
    "DocumentRepo",
    "InstitutionRepo",
    "NomineeRepo",
    "OwnsRepo",
    "PersonRepo",
    "RelationshipRepo",
    "WillRepo",
    "append_audit_entry",
    "as_of_clause",
    "bump_case_version",
    "close_edge",
    "compute_audit_hash",
    "get_db",
    "insert_edge",
    "now_utc",
    "query_graph_gql",
    "query_graph_sql",
    "record_change",
    "run_in_snapshot",
    "run_in_transaction",
    "snapshot",
    "snapshot_context",
    "supersede_edge",
]
