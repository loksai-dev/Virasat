"""Typed Repository Classes for Cloud Spanner Tables in Virasat.

Non-negotiable rules adhered to:
Rule 4: Bi-temporal edges (Relationship, Nominee, Owns) are never overwritten or hard-deleted.
Rule 5: Every mutation bumps Cases.data_version, writes a ChangeLog row and an AuditLog hash-chain entry.
Rule 10: Timestamps are generated in the application (UTC, microsecond precision).
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from google.cloud import spanner
from google.cloud.spanner_v1.snapshot import Snapshot
from google.cloud.spanner_v1.transaction import Transaction

from app.db.audit import append_audit_entry, record_change
from app.db.bitemporal import as_of_clause, insert_edge, now_utc, supersede_edge
from app.db.client import run_in_snapshot, run_in_transaction


# ---------------------------------------------------------------------------
# Helper: bump case version
# ---------------------------------------------------------------------------
def bump_case_version(transaction: Transaction, case_id: str) -> int:
    """Read current Cases.data_version, increment by 1, and update Cases."""
    sql = "SELECT data_version FROM Cases WHERE case_id = @case_id"
    rows = list(transaction.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
    if not rows:
        raise ValueError(f"Case {case_id} not found to bump data_version")

    current_version = rows[0][0]
    next_version = current_version + 1

    update_sql = "UPDATE Cases SET data_version = @next_ver WHERE case_id = @case_id"
    transaction.execute_update(
        update_sql,
        params={"next_ver": next_version, "case_id": case_id},
        param_types={"next_ver": spanner.param_types.INT64, "case_id": spanner.param_types.STRING},
    )
    return next_version


# ---------------------------------------------------------------------------
# Cases Repository
# ---------------------------------------------------------------------------
class CasesRepo:
    @staticmethod
    def get(case_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT case_id, owner_uid, seed_key, mode, title, status,
                   deceased_person_id, data_version, created_at, expires_at
            FROM Cases WHERE case_id = @case_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["case_id", "owner_uid", "seed_key", "mode", "title", "status",
                    "deceased_person_id", "data_version", "created_at", "expires_at"]
            return dict(zip(keys, rows[0], strict=False))
        return run_in_snapshot(_get)

    @staticmethod
    def create(data: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        now = now_utc()
        case_id = data.get("case_id", str(uuid.uuid4()))
        created_at = data.get("created_at", now)
        data_version = data.get("data_version", 1)

        row = {
            "case_id": case_id,
            "owner_uid": data["owner_uid"],
            "seed_key": data.get("seed_key"),
            "mode": data.get("mode", "prefilled"),
            "title": data.get("title", ""),
            "status": data.get("status", "in_progress"),
            "deceased_person_id": data.get("deceased_person_id"),
            "data_version": data_version,
            "created_at": created_at,
            "expires_at": data.get("expires_at"),
        }

        def _tx(tx: Transaction):
            sql = """
            INSERT INTO Cases (case_id, owner_uid, seed_key, mode, title, status, deceased_person_id, data_version, created_at, expires_at)
            VALUES (@case_id, @owner_uid, @seed_key, @mode, @title, @status, @deceased_person_id, @data_version, @created_at, @expires_at)
            """
            tx.execute_update(sql, params=row, param_types={
                "case_id": spanner.param_types.STRING,
                "owner_uid": spanner.param_types.STRING,
                "seed_key": spanner.param_types.STRING,
                "mode": spanner.param_types.STRING,
                "title": spanner.param_types.STRING,
                "status": spanner.param_types.STRING,
                "deceased_person_id": spanner.param_types.STRING,
                "data_version": spanner.param_types.INT64,
                "created_at": spanner.param_types.TIMESTAMP,
                "expires_at": spanner.param_types.TIMESTAMP,
            })
            record_change(tx, case_id, "Cases", case_id, None, None, row["status"], actor, now, now)
            append_audit_entry(tx, case_id, actor, "case_created", {"case_id": case_id, "status": row["status"]})

        run_in_transaction(_tx)
        return row


# ---------------------------------------------------------------------------
# Person Repository
# ---------------------------------------------------------------------------
class PersonRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT person_id, case_id, full_name, role, sex, dob, dod, personal_law, alive, eligibility, notes, deleted
            FROM Person WHERE case_id = @case_id AND deleted = FALSE ORDER BY person_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["person_id", "case_id", "full_name", "role", "sex", "dob", "dod", "personal_law", "alive", "eligibility", "notes", "deleted"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def create(data: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        case_id = data["case_id"]
        person_id = data.get("person_id", str(uuid.uuid4()))
        now = now_utc()
        row = {
            "person_id": person_id,
            "case_id": case_id,
            "full_name": data["full_name"],
            "role": data["role"],
            "sex": data.get("sex"),
            "dob": data.get("dob"),
            "dod": data.get("dod"),
            "personal_law": data.get("personal_law"),
            "alive": data.get("alive", True),
            "eligibility": data.get("eligibility"),
            "notes": data.get("notes"),
            "deleted": False,
        }

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            sql = """
            INSERT INTO Person (person_id, case_id, full_name, role, sex, dob, dod, personal_law, alive, eligibility, notes, deleted)
            VALUES (@person_id, @case_id, @full_name, @role, @sex, @dob, @dod, @personal_law, @alive, @eligibility, @notes, @deleted)
            """
            tx.execute_update(sql, params=row, param_types={
                "person_id": spanner.param_types.STRING,
                "case_id": spanner.param_types.STRING,
                "full_name": spanner.param_types.STRING,
                "role": spanner.param_types.STRING,
                "sex": spanner.param_types.STRING,
                "dob": spanner.param_types.DATE,
                "dod": spanner.param_types.DATE,
                "personal_law": spanner.param_types.STRING,
                "alive": spanner.param_types.BOOL,
                "eligibility": spanner.param_types.STRING,
                "notes": spanner.param_types.STRING,
                "deleted": spanner.param_types.BOOL,
            })
            record_change(tx, case_id, "Person", person_id, None, None, row["full_name"], actor, now, now)
            append_audit_entry(tx, case_id, actor, "person_created", {"person_id": person_id, "full_name": row["full_name"]})

        run_in_transaction(_tx)
        return row

    @staticmethod
    def soft_delete(case_id: str, person_id: str, actor: str = "system") -> None:
        now = now_utc()
        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            tx.execute_update(
                "UPDATE Person SET deleted = TRUE WHERE person_id = @pid AND case_id = @cid",
                params={"pid": person_id, "cid": case_id},
                param_types={"pid": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            record_change(tx, case_id, "Person", person_id, "deleted", "false", "true", actor, now, now)
            append_audit_entry(tx, case_id, actor, "person_deleted", {"person_id": person_id})
        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Asset Repository
# ---------------------------------------------------------------------------
class AssetRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT asset_id, case_id, institution_id, type, label, account_ref_masked,
                   est_value_inr, ownership, source_doc_id, extraction_confidence, status, deleted
            FROM Asset WHERE case_id = @case_id AND deleted = FALSE ORDER BY asset_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["asset_id", "case_id", "institution_id", "type", "label", "account_ref_masked",
                    "est_value_inr", "ownership", "source_doc_id", "extraction_confidence", "status", "deleted"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def create(data: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        case_id = data["case_id"]
        asset_id = data.get("asset_id", str(uuid.uuid4()))
        now = now_utc()
        val = data.get("est_value_inr")
        row = {
            "asset_id": asset_id,
            "case_id": case_id,
            "institution_id": data.get("institution_id"),
            "type": data["type"],
            "label": data.get("label", ""),
            "account_ref_masked": data.get("account_ref_masked"),
            "est_value_inr": Decimal(str(val)) if val is not None else None,
            "ownership": data.get("ownership"),
            "source_doc_id": data.get("source_doc_id"),
            "extraction_confidence": data.get("extraction_confidence"),
            "status": data.get("status", "LOCATED"),
            "deleted": False,
        }

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            sql = """
            INSERT INTO Asset (asset_id, case_id, institution_id, type, label, account_ref_masked, est_value_inr, ownership, source_doc_id, extraction_confidence, status, deleted)
            VALUES (@asset_id, @case_id, @institution_id, @type, @label, @account_ref_masked, @est_value_inr, @ownership, @source_doc_id, @extraction_confidence, @status, @deleted)
            """
            tx.execute_update(sql, params=row, param_types={
                "asset_id": spanner.param_types.STRING,
                "case_id": spanner.param_types.STRING,
                "institution_id": spanner.param_types.STRING,
                "type": spanner.param_types.STRING,
                "label": spanner.param_types.STRING,
                "account_ref_masked": spanner.param_types.STRING,
                "est_value_inr": spanner.param_types.NUMERIC,
                "ownership": spanner.param_types.STRING,
                "source_doc_id": spanner.param_types.STRING,
                "extraction_confidence": spanner.param_types.FLOAT64,
                "status": spanner.param_types.STRING,
                "deleted": spanner.param_types.BOOL,
            })
            record_change(tx, case_id, "Asset", asset_id, None, None, row["type"], actor, now, now)
            append_audit_entry(tx, case_id, actor, "asset_created", {"asset_id": asset_id, "type": row["type"]})

        run_in_transaction(_tx)
        return row

    @staticmethod
    def soft_delete(case_id: str, asset_id: str, actor: str = "system") -> None:
        now = now_utc()
        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            tx.execute_update(
                "UPDATE Asset SET deleted = TRUE WHERE asset_id = @aid AND case_id = @cid",
                params={"aid": asset_id, "cid": case_id},
                param_types={"aid": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            record_change(tx, case_id, "Asset", asset_id, "deleted", "false", "true", actor, now, now)
            append_audit_entry(tx, case_id, actor, "asset_deleted", {"asset_id": asset_id})
        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Relationship Repository (Bi-temporal)
# ---------------------------------------------------------------------------
class RelationshipRepo:
    @staticmethod
    def list_by_case(
        case_id: str,
        valid_at: datetime | None = None,
        known_at: datetime | None = None,
    ) -> list[dict[str, Any]]:
        asof, p, pt = as_of_clause(valid_at, known_at, prefix="r")
        def _list(snap: Snapshot):
            sql = f"""
            SELECT r.from_id, r.to_id, r.rel_type, r.case_id, r.valid_from, r.valid_to, r.recorded_from, r.recorded_to
            FROM Relationship r WHERE r.case_id = @case_id AND {asof}
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id, **p}, param_types={"case_id": spanner.param_types.STRING, **pt}))
            keys = ["from_id", "to_id", "rel_type", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def insert(data: dict[str, Any], actor: str = "system", valid_from: datetime | None = None) -> None:
        case_id = data["case_id"]
        now = now_utc()
        v_from = valid_from if valid_from is not None else now

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            insert_edge(tx, "Relationship", data, valid_from=v_from)
            record_change(tx, case_id, "Relationship", f"{data['from_id']}:{data['to_id']}", "rel_type", None, data["rel_type"], actor, v_from, now)
            append_audit_entry(tx, case_id, actor, "relationship_created", data)

        run_in_transaction(_tx)

    @staticmethod
    def supersede(
        case_id: str,
        from_id: str,
        to_id: str,
        rel_type: str,
        new_data: dict[str, Any],
        actor: str = "system",
        effective_date: datetime | None = None,
    ) -> None:
        now = now_utc()
        eff_date = effective_date if effective_date is not None else now
        key_filter = {"from_id": from_id, "to_id": to_id, "rel_type": rel_type, "case_id": case_id}

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            supersede_edge(tx, "Relationship", key_filter, new_data, effective_date=eff_date, now=now)
            record_change(tx, case_id, "Relationship", f"{from_id}:{to_id}", "superseded", rel_type, new_data.get("rel_type", rel_type), actor, eff_date, now)
            append_audit_entry(tx, case_id, actor, "relationship_superseded", {"from_id": from_id, "to_id": to_id, "old_rel": rel_type, "new_rel": new_data.get("rel_type")})

        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Nominee Repository (Bi-temporal)
# ---------------------------------------------------------------------------
class NomineeRepo:
    @staticmethod
    def list_by_case(
        case_id: str,
        valid_at: datetime | None = None,
        known_at: datetime | None = None,
    ) -> list[dict[str, Any]]:
        asof, p, pt = as_of_clause(valid_at, known_at, prefix="n")
        def _list(snap: Snapshot):
            sql = f"""
            SELECT n.person_id, n.asset_id, n.case_id, n.share_pct, n.valid_from, n.valid_to, n.recorded_from, n.recorded_to
            FROM Nominee n WHERE n.case_id = @case_id AND {asof}
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id, **p}, param_types={"case_id": spanner.param_types.STRING, **pt}))
            keys = ["person_id", "asset_id", "case_id", "share_pct", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def insert(data: dict[str, Any], actor: str = "system", valid_from: datetime | None = None) -> None:
        case_id = data["case_id"]
        now = now_utc()
        v_from = valid_from if valid_from is not None else now

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            insert_edge(tx, "Nominee", data, valid_from=v_from)
            record_change(tx, case_id, "Nominee", f"{data['asset_id']}:{data['person_id']}", "share_pct", None, str(data.get("share_pct")), actor, v_from, now)
            append_audit_entry(tx, case_id, actor, "nominee_created", data)

        run_in_transaction(_tx)

    @staticmethod
    def supersede(
        case_id: str,
        asset_id: str,
        person_id: str,
        new_data: dict[str, Any],
        actor: str = "system",
        effective_date: datetime | None = None,
    ) -> None:
        now = now_utc()
        eff_date = effective_date if effective_date is not None else now
        key_filter = {"asset_id": asset_id, "person_id": person_id, "case_id": case_id}

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            supersede_edge(tx, "Nominee", key_filter, new_data, effective_date=eff_date, now=now)
            record_change(tx, case_id, "Nominee", f"{asset_id}:{person_id}", "share_pct_superseded", None, str(new_data.get("share_pct")), actor, eff_date, now)
            append_audit_entry(tx, case_id, actor, "nominee_superseded", {"asset_id": asset_id, "person_id": person_id, "new_share": new_data.get("share_pct")})

        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Owns Repository (Bi-temporal)
# ---------------------------------------------------------------------------
class OwnsRepo:
    @staticmethod
    def list_by_case(
        case_id: str,
        valid_at: datetime | None = None,
        known_at: datetime | None = None,
    ) -> list[dict[str, Any]]:
        asof, p, pt = as_of_clause(valid_at, known_at, prefix="o")
        def _list(snap: Snapshot):
            sql = f"""
            SELECT o.person_id, o.asset_id, o.case_id, o.valid_from, o.valid_to, o.recorded_from, o.recorded_to
            FROM Owns o WHERE o.case_id = @case_id AND {asof}
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id, **p}, param_types={"case_id": spanner.param_types.STRING, **pt}))
            keys = ["person_id", "asset_id", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def insert(data: dict[str, Any], actor: str = "system", valid_from: datetime | None = None) -> None:
        case_id = data["case_id"]
        now = now_utc()
        v_from = valid_from if valid_from is not None else now

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            insert_edge(tx, "Owns", data, valid_from=v_from)
            record_change(tx, case_id, "Owns", f"{data['person_id']}:{data['asset_id']}", "owns", None, "active", actor, v_from, now)
            append_audit_entry(tx, case_id, actor, "owns_created", data)

        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Will, Claims, Disputes, Consent Repositories
# ---------------------------------------------------------------------------
class WillRepo:
    @staticmethod
    def get_by_case(case_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = "SELECT will_id, case_id, doc_id, status, executed_on, bequests FROM Will WHERE case_id = @case_id"
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["will_id", "case_id", "doc_id", "status", "executed_on", "bequests"]
            return dict(zip(keys, rows[0], strict=False))
        return run_in_snapshot(_get)


class ClaimRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT claim_id, case_id, asset_id, institution_id, route, status, status_reason,
                   amount_inr, packet, packet_gcs_uri, approved_by, submitted_at, due_at,
                   updated_at, computed_for_version
            FROM Claim WHERE case_id = @case_id ORDER BY claim_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["claim_id", "case_id", "asset_id", "institution_id", "route", "status", "status_reason",
                    "amount_inr", "packet", "packet_gcs_uri", "approved_by", "submitted_at", "due_at",
                    "updated_at", "computed_for_version"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)


class DisputeRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT dispute_id, case_id, kind, severity, title, evidence, evidence_hash,
                   recommended_action, status, computed_for_version
            FROM Dispute WHERE case_id = @case_id ORDER BY dispute_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["dispute_id", "case_id", "kind", "severity", "title", "evidence", "evidence_hash",
                    "recommended_action", "status", "computed_for_version"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)


class ConsentRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = "SELECT case_id, person_id, status, signed_at FROM Consent WHERE case_id = @case_id"
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["case_id", "person_id", "status", "signed_at"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)


class AuditLogRepo:
    @staticmethod
    def list_by_case(case_id: str, limit: int = 100) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT case_id, seq, actor, action, payload, prev_hash, entry_hash, occurred_at
            FROM AuditLog WHERE case_id = @case_id ORDER BY seq ASC LIMIT @lim
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id, "lim": limit}, param_types={"case_id": spanner.param_types.STRING, "lim": spanner.param_types.INT64}))
            keys = ["case_id", "seq", "actor", "action", "payload", "prev_hash", "entry_hash", "occurred_at"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)
