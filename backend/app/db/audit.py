"""AuditLog hash-chain and ChangeLog recording utilities."""

from datetime import datetime
import hashlib
import json
from typing import Any
import uuid
from google.cloud import spanner
from google.cloud.spanner_v1.transaction import Transaction

from app.db.bitemporal import now_utc

GENESIS_HASH = "0" * 64


def compute_audit_hash(
    case_id: str,
    seq: int,
    actor: str,
    action: str,
    prev_hash: str,
    occurred_at: datetime,
    payload_str: str,
) -> str:
    """Compute SHA-256 hash for audit chain entry."""
    data = f"{case_id}:{seq}:{actor}:{action}:{prev_hash}:{occurred_at.isoformat()}:{payload_str}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def append_audit_entry(
    transaction: Transaction,
    case_id: str,
    actor: str,
    action: str,
    payload: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> str:
    """Append a cryptographically hash-chained entry to AuditLog."""
    ts = occurred_at if occurred_at is not None else now_utc()
    payload_dict = payload or {}
    payload_json = json.dumps(payload_dict, sort_keys=True)

    # 1. Fetch current max seq and latest entry_hash for the case
    sql = """
    SELECT seq, entry_hash
    FROM AuditLog
    WHERE case_id = @case_id
    ORDER BY seq DESC
    LIMIT 1
    """
    rows = list(transaction.execute_sql(
        sql,
        params={"case_id": case_id},
        param_types={"case_id": spanner.param_types.STRING},
    ))

    if rows:
        last_seq, prev_hash = rows[0][0], rows[0][1]
        new_seq = last_seq + 1
    else:
        new_seq = 1
        prev_hash = GENESIS_HASH

    entry_hash = compute_audit_hash(case_id, new_seq, actor, action, prev_hash, ts, payload_json)

    insert_sql = """
    INSERT INTO AuditLog (case_id, seq, actor, action, payload, prev_hash, entry_hash, occurred_at)
    VALUES (@case_id, @seq, @actor, @action, JSON @payload, @prev_hash, @entry_hash, @occurred_at)
    """
    transaction.execute_update(
        insert_sql,
        params={
            "case_id": case_id,
            "seq": new_seq,
            "actor": actor,
            "action": action,
            "payload": payload_json,
            "prev_hash": prev_hash,
            "entry_hash": entry_hash,
            "occurred_at": ts,
        },
        param_types={
            "case_id": spanner.param_types.STRING,
            "seq": spanner.param_types.INT64,
            "actor": spanner.param_types.STRING,
            "action": spanner.param_types.STRING,
            "payload": spanner.param_types.STRING,
            "prev_hash": spanner.param_types.STRING,
            "entry_hash": spanner.param_types.STRING,
            "occurred_at": spanner.param_types.TIMESTAMP,
        },
    )

    return entry_hash


def record_change(
    transaction: Transaction,
    case_id: str,
    entity: str,
    entity_id: str,
    field: str | None,
    old_value: str | None,
    new_value: str | None,
    actor: str,
    valid_at: datetime | None = None,
    recorded_at: datetime | None = None,
) -> str:
    """Record a row mutation in ChangeLog."""
    change_id = str(uuid.uuid4())
    rec_at = recorded_at if recorded_at is not None else now_utc()
    val_at = valid_at if valid_at is not None else rec_at

    sql = """
    INSERT INTO ChangeLog (
      change_id, case_id, entity, entity_id, field, old_value, new_value,
      valid_at, recorded_at, actor
    ) VALUES (
      @change_id, @case_id, @entity, @entity_id, @field, @old_value, @new_value,
      @valid_at, @recorded_at, @actor
    )
    """
    transaction.execute_update(
        sql,
        params={
            "change_id": change_id,
            "case_id": case_id,
            "entity": entity,
            "entity_id": entity_id,
            "field": field,
            "old_value": old_value,
            "new_value": new_value,
            "valid_at": val_at,
            "recorded_at": rec_at,
            "actor": actor,
        },
        param_types={
            "change_id": spanner.param_types.STRING,
            "case_id": spanner.param_types.STRING,
            "entity": spanner.param_types.STRING,
            "entity_id": spanner.param_types.STRING,
            "field": spanner.param_types.STRING,
            "old_value": spanner.param_types.STRING,
            "new_value": spanner.param_types.STRING,
            "valid_at": spanner.param_types.TIMESTAMP,
            "recorded_at": spanner.param_types.TIMESTAMP,
            "actor": spanner.param_types.STRING,
        },
    )

    return change_id
