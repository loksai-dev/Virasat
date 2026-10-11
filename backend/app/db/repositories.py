"""Typed Repository Classes for Cloud Spanner Tables in Virasat.

Non-negotiable rules adhered to:
Rule 4: Bi-temporal edges (Relationship, Nominee, Owns) are never overwritten or hard-deleted.
Rule 5: Every mutation bumps Cases.data_version, writes a ChangeLog row and an AuditLog hash-chain entry.
Rule 10: Timestamps are generated in the application (UTC, microsecond precision).
"""

import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from google.cloud import spanner
from google.cloud.spanner_v1.snapshot import Snapshot
from google.cloud.spanner_v1.transaction import Transaction

from app.db.audit import append_audit_entry, record_change
from app.db.bitemporal import as_of_clause, close_edge, insert_edge, now_utc, supersede_edge
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
    def get(person_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT person_id, case_id, full_name, role, sex, dob, dod, personal_law, alive, eligibility, notes, deleted
            FROM Person WHERE person_id = @person_id
            """
            rows = list(snap.execute_sql(sql, params={"person_id": person_id}, param_types={"person_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["person_id", "case_id", "full_name", "role", "sex", "dob", "dod", "personal_law", "alive", "eligibility", "notes", "deleted"]
            return dict(zip(keys, rows[0], strict=False))
        return run_in_snapshot(_get)

    @staticmethod
    def update(case_id: str, person_id: str, updates: dict[str, Any], actor: str = "system") -> tuple[dict[str, Any], int]:
        now = now_utc()
        result_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            sql = """
            SELECT person_id, case_id, full_name, role, sex, dob, dod, personal_law, alive, eligibility, notes, deleted
            FROM Person WHERE person_id = @person_id AND case_id = @case_id
            """
            rows = list(tx.execute_sql(sql, params={"person_id": person_id, "case_id": case_id}, param_types={"person_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}))
            if not rows:
                raise ValueError(f"Person {person_id} not found in case {case_id}")
            keys = ["person_id", "case_id", "full_name", "role", "sex", "dob", "dod", "personal_law", "alive", "eligibility", "notes", "deleted"]
            current = dict(zip(keys, rows[0], strict=False))

            set_clauses = []
            params: dict[str, Any] = {"person_id": person_id, "case_id": case_id}
            param_types: dict[str, Any] = {"person_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}

            for k, new_v in updates.items():
                if k in current and current[k] != new_v:
                    set_clauses.append(f"{k} = @{k}")
                    params[k] = new_v
                    if isinstance(new_v, str):
                        param_types[k] = spanner.param_types.STRING
                    elif isinstance(new_v, bool):
                        param_types[k] = spanner.param_types.BOOL
                    elif hasattr(new_v, "isoformat"):
                        param_types[k] = spanner.param_types.DATE
                    record_change(tx, case_id, "Person", person_id, k, str(current[k]), str(new_v), actor, now, now)
                    current[k] = new_v

            if set_clauses:
                update_sql = f"UPDATE Person SET {', '.join(set_clauses)} WHERE person_id = @person_id AND case_id = @case_id"
                tx.execute_update(update_sql, params=params, param_types=param_types)
                append_audit_entry(tx, case_id, actor, "person_updated", {"person_id": person_id, "fields": list(updates.keys())})

            result_container["person"] = current
            result_container["version"] = ver

        run_in_transaction(_tx)
        return result_container["person"], result_container["version"]

    @staticmethod
    def soft_delete(case_id: str, person_id: str, actor: str = "system") -> int:
        now = now_utc()
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            tx.execute_update(
                "UPDATE Person SET deleted = TRUE WHERE person_id = @pid AND case_id = @cid",
                params={"pid": person_id, "cid": case_id},
                param_types={"pid": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            from app.db.bitemporal import close_edge
            close_edge(tx, "Relationship", {"from_id": person_id, "case_id": case_id}, valid_to=now, recorded_to=now)
            close_edge(tx, "Relationship", {"to_id": person_id, "case_id": case_id}, valid_to=now, recorded_to=now)
            close_edge(tx, "Nominee", {"person_id": person_id, "case_id": case_id}, valid_to=now, recorded_to=now)
            close_edge(tx, "Owns", {"person_id": person_id, "case_id": case_id}, valid_to=now, recorded_to=now)

            record_change(tx, case_id, "Person", person_id, "deleted", "false", "true", actor, now, now)
            append_audit_entry(tx, case_id, actor, "person_deleted", {"person_id": person_id})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return ver_container["version"]


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
    def get(asset_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT asset_id, case_id, institution_id, type, label, account_ref_masked,
                   est_value_inr, ownership, source_doc_id, extraction_confidence, status, deleted
            FROM Asset WHERE asset_id = @asset_id
            """
            rows = list(snap.execute_sql(sql, params={"asset_id": asset_id}, param_types={"asset_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["asset_id", "case_id", "institution_id", "type", "label", "account_ref_masked",
                    "est_value_inr", "ownership", "source_doc_id", "extraction_confidence", "status", "deleted"]
            return dict(zip(keys, rows[0], strict=False))
        return run_in_snapshot(_get)

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
    def update(case_id: str, asset_id: str, updates: dict[str, Any], actor: str = "system") -> tuple[dict[str, Any], int]:
        now = now_utc()
        result_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            sql = """
            SELECT asset_id, case_id, institution_id, type, label, account_ref_masked,
                   est_value_inr, ownership, source_doc_id, extraction_confidence, status, deleted
            FROM Asset WHERE asset_id = @asset_id AND case_id = @case_id
            """
            rows = list(tx.execute_sql(sql, params={"asset_id": asset_id, "case_id": case_id}, param_types={"asset_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}))
            if not rows:
                raise ValueError(f"Asset {asset_id} not found in case {case_id}")
            keys = ["asset_id", "case_id", "institution_id", "type", "label", "account_ref_masked",
                    "est_value_inr", "ownership", "source_doc_id", "extraction_confidence", "status", "deleted"]
            current = dict(zip(keys, rows[0], strict=False))

            set_clauses = []
            params: dict[str, Any] = {"asset_id": asset_id, "case_id": case_id}
            param_types: dict[str, Any] = {"asset_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}

            for k, new_v in updates.items():
                if k in current and current[k] != new_v:
                    set_clauses.append(f"{k} = @{k}")
                    params[k] = new_v
                    if isinstance(new_v, str):
                        param_types[k] = spanner.param_types.STRING
                    elif isinstance(new_v, bool):
                        param_types[k] = spanner.param_types.BOOL
                    elif isinstance(new_v, (int, float)):
                        param_types[k] = spanner.param_types.FLOAT64
                    elif isinstance(new_v, Decimal):
                        param_types[k] = spanner.param_types.NUMERIC
                    record_change(tx, case_id, "Asset", asset_id, k, str(current[k]), str(new_v), actor, now, now)
                    current[k] = new_v

            if set_clauses:
                update_sql = f"UPDATE Asset SET {', '.join(set_clauses)} WHERE asset_id = @asset_id AND case_id = @case_id"
                tx.execute_update(update_sql, params=params, param_types=param_types)
                append_audit_entry(tx, case_id, actor, "asset_updated", {"asset_id": asset_id, "fields": list(updates.keys())})

            result_container["asset"] = current
            result_container["version"] = ver

        run_in_transaction(_tx)
        return result_container["asset"], result_container["version"]

    @staticmethod
    def soft_delete(case_id: str, asset_id: str, actor: str = "system") -> int:
        now = now_utc()
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            tx.execute_update(
                "UPDATE Asset SET deleted = TRUE WHERE asset_id = @aid AND case_id = @cid",
                params={"aid": asset_id, "cid": case_id},
                param_types={"aid": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            from app.db.bitemporal import close_edge
            close_edge(tx, "Nominee", {"asset_id": asset_id, "case_id": case_id}, valid_to=now, recorded_to=now)
            close_edge(tx, "Owns", {"asset_id": asset_id, "case_id": case_id}, valid_to=now, recorded_to=now)
            tx.execute_update(
                "DELETE FROM HeldAt WHERE asset_id = @aid AND case_id = @cid",
                params={"aid": asset_id, "cid": case_id},
                param_types={"aid": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            record_change(tx, case_id, "Asset", asset_id, "deleted", "false", "true", actor, now, now)
            append_audit_entry(tx, case_id, actor, "asset_deleted", {"asset_id": asset_id})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return ver_container["version"]


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

    @staticmethod
    def close(
        case_id: str,
        from_id: str,
        to_id: str,
        rel_type: str,
        actor: str = "system",
        effective_date: datetime | None = None,
    ) -> int:
        now = now_utc()
        eff_date = effective_date if effective_date is not None else now
        key_filter = {"from_id": from_id, "to_id": to_id, "rel_type": rel_type, "case_id": case_id}
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            close_edge(tx, "Relationship", key_filter, valid_to=eff_date, recorded_to=now)
            record_change(tx, case_id, "Relationship", f"{from_id}:{to_id}", "closed", rel_type, None, actor, eff_date, now)
            append_audit_entry(tx, case_id, actor, "relationship_closed", {"from_id": from_id, "to_id": to_id, "rel_type": rel_type})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return ver_container["version"]


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

    @staticmethod
    def replace_all_for_asset(
        case_id: str,
        asset_id: str,
        nominees: list[dict[str, Any]],
        actor: str = "system",
        effective_date: datetime | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        now = now_utc()
        eff_date = effective_date if effective_date is not None else now
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            # 1. Close all active nominees for this asset
            close_edge(tx, "Nominee", {"asset_id": asset_id, "case_id": case_id}, valid_to=eff_date, recorded_to=now)
            # 2. Insert new active nominees
            for n in nominees:
                row = {
                    "asset_id": asset_id,
                    "person_id": n["person_id"],
                    "case_id": case_id,
                    "share_pct": float(n["share_pct"]),
                }
                insert_edge(tx, "Nominee", row, valid_from=eff_date, recorded_from=now)
                record_change(tx, case_id, "Nominee", f"{asset_id}:{n['person_id']}", "share_pct", None, str(n["share_pct"]), actor, eff_date, now)

            append_audit_entry(tx, case_id, actor, "nominees_replaced", {"asset_id": asset_id, "count": len(nominees)})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return nominees, ver_container["version"]


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

    @staticmethod
    def upsert(
        case_id: str,
        status: str,
        executed_on: Any,
        bequests: list[dict[str, Any]],
        doc_id: str | None = None,
        actor: str = "system",
    ) -> tuple[dict[str, Any], int]:
        now = now_utc()
        ver_container: dict[str, Any] = {}
        row_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            existing_sql = "SELECT will_id, doc_id FROM Will WHERE case_id = @case_id"
            rows = list(tx.execute_sql(existing_sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            bequests_json = json.dumps(bequests)
            exec_date = executed_on.isoformat() if hasattr(executed_on, "isoformat") else (str(executed_on) if executed_on else None)

            if rows:
                will_id = rows[0][0]
                existing_doc_id = rows[0][1]
                target_doc_id = doc_id or existing_doc_id
                sql = """
                UPDATE Will SET status = @status, executed_on = @executed_on, bequests = PARSE_JSON(@bequests), doc_id = @doc_id
                WHERE case_id = @case_id
                """
                tx.execute_update(sql, params={
                    "case_id": case_id,
                    "status": status,
                    "executed_on": exec_date,
                    "bequests": bequests_json,
                    "doc_id": target_doc_id,
                }, param_types={
                    "case_id": spanner.param_types.STRING,
                    "status": spanner.param_types.STRING,
                    "executed_on": spanner.param_types.DATE if exec_date else spanner.param_types.STRING,
                    "bequests": spanner.param_types.STRING,
                    "doc_id": spanner.param_types.STRING,
                })
            else:
                will_id = str(uuid.uuid4())
                sql = """
                INSERT INTO Will (will_id, case_id, doc_id, status, executed_on, bequests)
                VALUES (@will_id, @case_id, @doc_id, @status, @executed_on, PARSE_JSON(@bequests))
                """
                tx.execute_update(sql, params={
                    "will_id": will_id,
                    "case_id": case_id,
                    "doc_id": doc_id,
                    "status": status,
                    "executed_on": exec_date,
                    "bequests": bequests_json,
                }, param_types={
                    "will_id": spanner.param_types.STRING,
                    "case_id": spanner.param_types.STRING,
                    "doc_id": spanner.param_types.STRING,
                    "status": spanner.param_types.STRING,
                    "executed_on": spanner.param_types.DATE if exec_date else spanner.param_types.STRING,
                    "bequests": spanner.param_types.STRING,
                })

            record_change(tx, case_id, "Will", will_id, "status", None, status, actor, now, now)
            append_audit_entry(tx, case_id, actor, "will_updated", {"status": status, "bequests_count": len(bequests)})
            ver_container["version"] = ver
            row_container["row"] = {
                "will_id": will_id,
                "case_id": case_id,
                "status": status,
                "executed_on": exec_date,
                "bequests": bequests,
            }

        run_in_transaction(_tx)
        return row_container["row"], ver_container["version"]


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

    @staticmethod
    def upsert_status(
        case_id: str,
        person_id: str,
        status: str,
        actor: str = "system",
    ) -> tuple[dict[str, Any], int]:
        now = now_utc()
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            tx.insert_or_update(
                table="Consent",
                columns=["case_id", "person_id", "status", "signed_at"],
                values=[[case_id, person_id, status, now]],
            )
            record_change(tx, case_id, "Consent", f"{case_id}:{person_id}", "status", None, status, actor, now, now)
            append_audit_entry(tx, case_id, actor, "consent_updated", {"person_id": person_id, "status": status})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return {"case_id": case_id, "person_id": person_id, "status": status, "signed_at": now.isoformat()}, ver_container["version"]


class HistoryRepo:
    @staticmethod
    def get_history(case_id: str, entity: str | None = None, entity_id: str | None = None) -> list[dict[str, Any]]:
        def _read(snap: Snapshot) -> list[dict[str, Any]]:
            # 1. ChangeLog
            where = ["case_id = @case_id"]
            params: dict[str, Any] = {"case_id": case_id}
            param_types: dict[str, Any] = {"case_id": spanner.param_types.STRING}

            if entity:
                where.append("LOWER(entity) = @entity")
                params["entity"] = entity.lower()
                param_types["entity"] = spanner.param_types.STRING
            if entity_id:
                where.append("entity_id = @entity_id")
                params["entity_id"] = entity_id
                param_types["entity_id"] = spanner.param_types.STRING

            sql = f"""
            SELECT change_id, case_id, entity, entity_id, field, old_value, new_value, valid_at, recorded_at, actor
            FROM ChangeLog
            WHERE {' AND '.join(where)}
            ORDER BY recorded_at DESC
            """
            rows = list(snap.execute_sql(sql, params=params, param_types=param_types))
            history = []
            for r in rows:
                history.append({
                    "change_id": r[0],
                    "case_id": r[1],
                    "entity": r[2],
                    "entity_id": r[3],
                    "field": r[4],
                    "old_value": r[5],
                    "new_value": r[6],
                    "valid_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                    "recorded_at": r[8].isoformat() if hasattr(r[8], "isoformat") else str(r[8]),
                    "actor": r[9],
                    "type": "attribute_change",
                })

            # 2. Edge history (bi-temporal edge ranges)
            if entity is None or entity.lower() in ("relationship", "relations"):
                r_sql = "SELECT from_id, to_id, rel_type, valid_from, valid_to, recorded_from, recorded_to FROM Relationship WHERE case_id = @case_id ORDER BY recorded_from DESC"
                for r in snap.execute_sql(r_sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}):
                    if entity_id is None or entity_id in (f"{r[0]}:{r[1]}", r[0], r[1]):
                        history.append({
                            "entity": "Relationship",
                            "entity_id": f"{r[0]}:{r[1]}",
                            "field": "rel_type",
                            "new_value": r[2],
                            "valid_from": r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
                            "valid_to": r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4]),
                            "recorded_from": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                            "recorded_to": r[6].isoformat() if hasattr(r[6], "isoformat") else str(r[6]),
                            "recorded_at": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                            "type": "edge_bitemporal",
                        })

            if entity is None or entity.lower() in ("nominee", "nominees"):
                n_sql = "SELECT asset_id, person_id, share_pct, valid_from, valid_to, recorded_from, recorded_to FROM Nominee WHERE case_id = @case_id ORDER BY recorded_from DESC"
                for r in snap.execute_sql(n_sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}):
                    if entity_id is None or entity_id in (r[0], r[1], f"{r[0]}:{r[1]}"):
                        history.append({
                            "entity": "Nominee",
                            "entity_id": f"{r[0]}:{r[1]}",
                            "field": "share_pct",
                            "new_value": str(r[2]),
                            "valid_from": r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
                            "valid_to": r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4]),
                            "recorded_from": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                            "recorded_to": r[6].isoformat() if hasattr(r[6], "isoformat") else str(r[6]),
                            "recorded_at": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                            "type": "edge_bitemporal",
                        })

            return history

        return run_in_snapshot(_read)


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


class ShareResultRepo:
    @staticmethod
    def list_by_case_and_scenario(case_id: str, scenario: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT case_id, scenario, person_id, asset_key, share_pct, amount_inr,
                   route, clause_ids, rule_ids, notes, computed_for_version, run_id
            FROM ShareResult
            WHERE case_id = @case_id AND scenario = @scenario
            ORDER BY person_id, asset_key
            """
            rows = list(snap.execute_sql(
                sql,
                params={"case_id": case_id, "scenario": scenario},
                param_types={"case_id": spanner.param_types.STRING, "scenario": spanner.param_types.STRING},
            ))
            keys = [
                "case_id", "scenario", "person_id", "asset_key", "share_pct", "amount_inr",
                "route", "clause_ids", "rule_ids", "notes", "computed_for_version", "run_id"
            ]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def save_shares(
        case_id: str,
        scenario: str,
        shares: list[dict[str, Any]],
        computed_for_version: int,
        run_id: str | None = None,
    ) -> None:
        def _tx(tx: Transaction):
            columns = [
                "case_id", "scenario", "person_id", "asset_key",
                "share_pct", "amount_inr", "route",
                "clause_ids", "rule_ids", "notes",
                "computed_for_version", "run_id"
            ]
            values = []
            for s in shares:
                c_ids = s.get("clause_ids")
                r_ids = s.get("rule_ids")
                nts = s.get("notes")
                values.append([
                    case_id,
                    scenario,
                    s["person_id"],
                    s.get("asset_key", "-"),
                    float(s.get("share_pct", 0.0)),
                    s.get("amount_inr"),
                    s.get("route", "SUCCESSION"),
                    json.dumps(c_ids) if c_ids is not None else None,
                    json.dumps(r_ids) if r_ids is not None else None,
                    json.dumps(nts) if nts is not None else None,
                    computed_for_version,
                    run_id,
                ])
            if values:
                tx.insert_or_update(table="ShareResult", columns=columns, values=values)
        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# Document Repository
# ---------------------------------------------------------------------------
class DocumentRepo:
    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT doc_id, case_id, gcs_uri, doc_type, original_name,
                   extracted, field_confidence, status, verified, degraded,
                   uploaded_at, deleted
            FROM Document WHERE case_id = @case_id AND deleted = FALSE
            ORDER BY uploaded_at ASC, doc_id ASC
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = [
                "doc_id", "case_id", "gcs_uri", "doc_type", "original_name",
                "extracted", "field_confidence", "status", "verified", "degraded",
                "uploaded_at", "deleted",
            ]
            results = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                if isinstance(d["extracted"], str):
                    try:
                        d["extracted"] = json.loads(d["extracted"])
                    except Exception:
                        pass
                if isinstance(d["field_confidence"], str):
                    try:
                        d["field_confidence"] = json.loads(d["field_confidence"])
                    except Exception:
                        pass
                results.append(d)
            return results
        return run_in_snapshot(_list)

    @staticmethod
    def get(doc_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT doc_id, case_id, gcs_uri, doc_type, original_name,
                   extracted, field_confidence, status, verified, degraded,
                   uploaded_at, deleted
            FROM Document WHERE doc_id = @doc_id
            """
            rows = list(snap.execute_sql(sql, params={"doc_id": doc_id}, param_types={"doc_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = [
                "doc_id", "case_id", "gcs_uri", "doc_type", "original_name",
                "extracted", "field_confidence", "status", "verified", "degraded",
                "uploaded_at", "deleted",
            ]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d["extracted"], str):
                try:
                    d["extracted"] = json.loads(d["extracted"])
                except Exception:
                    pass
            if isinstance(d["field_confidence"], str):
                try:
                    d["field_confidence"] = json.loads(d["field_confidence"])
                except Exception:
                    pass
            return d
        return run_in_snapshot(_get)

    @staticmethod
    def count_by_case(case_id: str) -> int:
        def _count(snap: Snapshot):
            sql = "SELECT COUNT(1) FROM Document WHERE case_id = @case_id AND deleted = FALSE"
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            return rows[0][0] if rows else 0
        return run_in_snapshot(_count)

    @staticmethod
    def create(data: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        case_id = data["case_id"]
        doc_id = data.get("doc_id", str(uuid.uuid4()))
        now = now_utc()
        row = {
            "doc_id": doc_id,
            "case_id": case_id,
            "gcs_uri": data["gcs_uri"],
            "doc_type": data.get("doc_type"),
            "original_name": data.get("original_name", ""),
            "extracted": json.dumps(data.get("extracted", {})) if isinstance(data.get("extracted"), (dict, list)) else (data.get("extracted") or "{}"),
            "field_confidence": json.dumps(data.get("field_confidence", {})) if isinstance(data.get("field_confidence"), (dict, list)) else (data.get("field_confidence") or "{}"),
            "status": data.get("status", "PENDING"),
            "verified": data.get("verified", False),
            "degraded": data.get("degraded", False),
            "uploaded_at": data.get("uploaded_at", now),
            "deleted": False,
        }

        def _tx(tx: Transaction):
            bump_case_version(tx, case_id)
            sql = """
            INSERT INTO Document (doc_id, case_id, gcs_uri, doc_type, original_name, extracted, field_confidence, status, verified, degraded, uploaded_at, deleted)
            VALUES (@doc_id, @case_id, @gcs_uri, @doc_type, @original_name, PARSE_JSON(@extracted), PARSE_JSON(@field_confidence), @status, @verified, @degraded, @uploaded_at, @deleted)
            """
            tx.execute_update(sql, params=row, param_types={
                "doc_id": spanner.param_types.STRING,
                "case_id": spanner.param_types.STRING,
                "gcs_uri": spanner.param_types.STRING,
                "doc_type": spanner.param_types.STRING,
                "original_name": spanner.param_types.STRING,
                "extracted": spanner.param_types.STRING,
                "field_confidence": spanner.param_types.STRING,
                "status": spanner.param_types.STRING,
                "verified": spanner.param_types.BOOL,
                "degraded": spanner.param_types.BOOL,
                "uploaded_at": spanner.param_types.TIMESTAMP,
                "deleted": spanner.param_types.BOOL,
            })
            record_change(tx, case_id, "Document", doc_id, "uploaded", None, row["original_name"], actor, now, now)
            append_audit_entry(tx, case_id, actor, "document_uploaded", {"doc_id": doc_id, "filename": row["original_name"]})

        run_in_transaction(_tx)
        res = dict(row)
        res["extracted"] = data.get("extracted", {})
        res["field_confidence"] = data.get("field_confidence", {})
        return res

    @staticmethod
    def update(case_id: str, doc_id: str, updates: dict[str, Any], actor: str = "system") -> tuple[dict[str, Any], int]:
        now = now_utc()
        result_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            sql = """
            SELECT doc_id, case_id, gcs_uri, doc_type, original_name, extracted, field_confidence, status, verified, degraded, uploaded_at, deleted
            FROM Document WHERE doc_id = @doc_id AND case_id = @case_id
            """
            rows = list(tx.execute_sql(sql, params={"doc_id": doc_id, "case_id": case_id}, param_types={"doc_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}))
            if not rows:
                raise ValueError(f"Document {doc_id} not found in case {case_id}")
            keys = ["doc_id", "case_id", "gcs_uri", "doc_type", "original_name", "extracted", "field_confidence", "status", "verified", "degraded", "uploaded_at", "deleted"]
            current = dict(zip(keys, rows[0], strict=False))

            set_clauses = []
            params: dict[str, Any] = {"doc_id": doc_id, "case_id": case_id}
            param_types: dict[str, Any] = {"doc_id": spanner.param_types.STRING, "case_id": spanner.param_types.STRING}

            for k, new_v in updates.items():
                if k in ("extracted", "field_confidence"):
                    json_str = json.dumps(new_v) if isinstance(new_v, (dict, list)) else new_v
                    set_clauses.append(f"{k} = PARSE_JSON(@{k})")
                    params[k] = json_str
                    param_types[k] = spanner.param_types.STRING
                    current[k] = new_v
                elif k in current and current[k] != new_v:
                    set_clauses.append(f"{k} = @{k}")
                    params[k] = new_v
                    if isinstance(new_v, str):
                        param_types[k] = spanner.param_types.STRING
                    elif isinstance(new_v, bool):
                        param_types[k] = spanner.param_types.BOOL
                    record_change(tx, case_id, "Document", doc_id, k, str(current[k]), str(new_v), actor, now, now)
                    current[k] = new_v

            if set_clauses:
                update_sql = f"UPDATE Document SET {', '.join(set_clauses)} WHERE doc_id = @doc_id AND case_id = @case_id"
                tx.execute_update(update_sql, params=params, param_types=param_types)
                append_audit_entry(tx, case_id, actor, "document_updated", {"doc_id": doc_id, "fields": list(updates.keys())})

            result_container["document"] = current
            result_container["version"] = ver

        run_in_transaction(_tx)
        return result_container["document"], result_container["version"]

    @staticmethod
    def soft_delete(case_id: str, doc_id: str, actor: str = "system") -> int:
        now = now_utc()
        ver_container: dict[str, Any] = {}

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            tx.execute_update(
                "UPDATE Document SET deleted = TRUE WHERE doc_id = @did AND case_id = @cid",
                params={"did": doc_id, "cid": case_id},
                param_types={"did": spanner.param_types.STRING, "cid": spanner.param_types.STRING},
            )
            record_change(tx, case_id, "Document", doc_id, "deleted", "false", "true", actor, now, now)
            append_audit_entry(tx, case_id, actor, "document_deleted", {"doc_id": doc_id})
            ver_container["version"] = ver

        run_in_transaction(_tx)
        return ver_container["version"]

