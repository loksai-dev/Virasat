"""AuditLog hash-chain and ChangeLog recording utilities."""

import json
import uuid
from datetime import datetime
from typing import Any

from google.cloud import spanner
from google.cloud.spanner_v1.transaction import Transaction

from app.db.bitemporal import now_utc
from app.engines.audit import append as engine_append, compute_entry_hash


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
    data = {
        "action": action,
        "actor": actor,
        "case_id": case_id,
        "occurred_at": occurred_at.isoformat(),
        "payload": json.loads(payload_str) if payload_str else {},
        "seq": seq,
    }
    return compute_entry_hash(prev_hash, data)


def append_audit_entry(
    transaction: Transaction,
    case_id: str,
    actor: str,
    action: str,
    payload: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> str:
    """Append a cryptographically hash-chained entry to AuditLog."""
    res = engine_append(
        case_id=case_id,
        actor=actor,
        action=action,
        payload=payload,
        tx=transaction,
        occurred_at=occurred_at,
    )
    return res["entry_hash"]


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
