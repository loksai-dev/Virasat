"""Audit hash chain engine (SHA-256 tamper-evident log) with PII redaction."""

import hashlib
import json
import re
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from google.cloud import spanner
from google.cloud.spanner_v1.snapshot import Snapshot
from google.cloud.spanner_v1.transaction import Transaction

from app.db.bitemporal import now_utc
from app.db.client import run_in_snapshot, run_in_transaction

GENESIS_HASH = "0" * 64

# PII Patterns
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$", re.IGNORECASE)
AADHAAR_REGEX = re.compile(r"^\d{4}\s?\d{4}\s?\d{4}$")
PHONE_REGEX = re.compile(r"^(?:\+91|91)?[6-9]\d{9}$")
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")
SENSITIVE_KEY_NAMES = {"password", "secret", "raw_token", "aadhaar_raw", "pan_raw"}


def redact_pii(val: Any) -> Any:
    """Recursively redact or mask PII from payloads before hashing and storing."""
    if isinstance(val, dict):
        redacted = {}
        for k, v in val.items():
            if k.lower() in SENSITIVE_KEY_NAMES:
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_pii(v)
        return redacted
    if isinstance(val, list):
        return [redact_pii(x) for x in val]
    if isinstance(val, str):
        s = val.strip()
        if PAN_REGEX.match(s):
            return f"{s[:2]}*****{s[-1:]}"
        if AADHAAR_REGEX.match(s):
            clean = s.replace(" ", "")
            return f"********{clean[-4:]}"
        if PHONE_REGEX.match(s):
            return f"******{s[-4:]}"
        if EMAIL_REGEX.match(s):
            parts = s.split("@")
            user = parts[0]
            masked_user = user[0] + "***" if len(user) > 1 else "***"
            return f"{masked_user}@{parts[1]}"
        return val
    if isinstance(val, Decimal):
        return str(val)
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def canonical_json(data: Any) -> str:
    """Serialize data to a deterministic canonical JSON string."""
    def _default(obj: Any) -> Any:
        if isinstance(obj, (datetime,)):
            if obj.tzinfo is None:
                obj = obj.replace(tzinfo=UTC)
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, uuid.UUID):
            return str(obj)
        raise TypeError(f"Type {type(obj)} not serializable in canonical_json")

    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=_default)


def compute_entry_hash(prev_hash: str, canonical_dict: dict[str, Any]) -> str:
    """Compute sha256(prev_hash + canonical_json({case_id, seq, actor, action, payload, occurred_at}))."""
    canon = canonical_json(canonical_dict)
    combined = (prev_hash + canon).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def append(
    case_id: str,
    actor: str,
    action: str,
    payload: dict[str, Any] | None = None,
    tx: Transaction | None = None,
    occurred_at: datetime | None = None,
) -> dict[str, Any]:
    """Append a cryptographically hash-chained entry to AuditLog inside a Spanner transaction.

    Actors must be formatted as:
    - 'user:<uid>'
    - 'agent:<name>'
    - 'institution:<name> (simulated)'
    """
    ts = occurred_at if occurred_at is not None else now_utc()
    clean_payload = redact_pii(payload or {})

    def _execute(transaction: Transaction) -> dict[str, Any]:
        # 1. Fetch current max seq and latest entry_hash
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

        canonical_dict = {
            "action": action,
            "actor": actor,
            "case_id": case_id,
            "occurred_at": ts.isoformat(),
            "payload": clean_payload,
            "seq": new_seq,
        }

        entry_hash = compute_entry_hash(prev_hash, canonical_dict)
        payload_str = canonical_json(clean_payload)

        insert_sql = """
        INSERT INTO AuditLog (case_id, seq, actor, action, payload, prev_hash, entry_hash, occurred_at)
        VALUES (@case_id, @seq, @actor, @action, PARSE_JSON(@payload), @prev_hash, @entry_hash, @occurred_at)
        """
        transaction.execute_update(
            insert_sql,
            params={
                "case_id": case_id,
                "seq": new_seq,
                "actor": actor,
                "action": action,
                "payload": payload_str,
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

        return {
            "case_id": case_id,
            "seq": new_seq,
            "actor": actor,
            "action": action,
            "payload": clean_payload,
            "prev_hash": prev_hash,
            "entry_hash": entry_hash,
            "occurred_at": ts.isoformat(),
        }

    if tx is not None:
        return _execute(tx)
    return run_in_transaction(_execute)


def list_audit_entries(case_id: str) -> list[dict[str, Any]]:
    """List all audit log entries for a case ordered by seq ASC."""
    def _read(snap: Snapshot) -> list[dict[str, Any]]:
        sql = """
        SELECT case_id, seq, actor, action, TO_JSON_STRING(payload), prev_hash, entry_hash, occurred_at
        FROM AuditLog
        WHERE case_id = @case_id
        ORDER BY seq ASC
        """
        rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
        entries = []
        for r in rows:
            raw_payload = r[4]
            payload = json.loads(raw_payload) if raw_payload else {}
            entries.append({
                "entry_id": f"{r[0]}:{r[1]}",
                "case_id": r[0],
                "seq": r[1],
                "actor": r[2],
                "action": r[3],
                "payload": payload,
                "prev_hash": r[5] or GENESIS_HASH,
                "entry_hash": r[6],
                "hash": r[6],
                "occurred_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                "timestamp": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
            })
        return entries

    return run_in_snapshot(_read)


def verify(case_id: str) -> dict[str, Any]:
    """Cryptographically recompute and verify integrity of the entire audit chain.

    Returns:
    {
      "valid": bool,
      "is_valid": bool,
      "case_id": case_id,
      "first_bad_seq": int | None,
      "verified_entries": int,
      "last_verified_hash": str
    }
    """
    entries = list_audit_entries(case_id)
    if not entries:
        return {
            "valid": True,
            "is_valid": True,
            "case_id": case_id,
            "first_bad_seq": None,
            "verified_entries": 0,
            "last_verified_hash": GENESIS_HASH,
        }

    expected_prev = GENESIS_HASH
    for idx, entry in enumerate(entries, start=1):
        actual_seq = entry["seq"]
        if actual_seq != idx:
            return {
                "valid": False,
                "is_valid": False,
                "case_id": case_id,
                "first_bad_seq": actual_seq,
                "verified_entries": idx - 1,
                "last_verified_hash": expected_prev,
            }

        if entry["prev_hash"] != expected_prev:
            return {
                "valid": False,
                "is_valid": False,
                "case_id": case_id,
                "first_bad_seq": actual_seq,
                "verified_entries": idx - 1,
                "last_verified_hash": expected_prev,
            }

        # Recompute hash
        canonical_dict = {
            "action": entry["action"],
            "actor": entry["actor"],
            "case_id": case_id,
            "occurred_at": entry["occurred_at"],
            "payload": entry["payload"],
            "seq": actual_seq,
        }
        recomputed = compute_entry_hash(expected_prev, canonical_dict)
        if recomputed != entry["entry_hash"]:
            return {
                "valid": False,
                "is_valid": False,
                "case_id": case_id,
                "first_bad_seq": actual_seq,
                "verified_entries": idx - 1,
                "last_verified_hash": expected_prev,
            }

        expected_prev = entry["entry_hash"]

    return {
        "valid": True,
        "is_valid": True,
        "case_id": case_id,
        "first_bad_seq": None,
        "verified_entries": len(entries),
        "last_verified_hash": expected_prev,
    }
