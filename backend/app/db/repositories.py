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

    @staticmethod
    def list_by_asset(
        asset_id: str,
        valid_at: datetime | None = None,
        known_at: datetime | None = None,
    ) -> list[dict[str, Any]]:
        asof, p, pt = as_of_clause(valid_at, known_at, prefix="n")
        def _list(snap: Snapshot):
            sql = f"""
            SELECT n.person_id, n.asset_id, n.case_id, n.share_pct, n.valid_from, n.valid_to, n.recorded_from, n.recorded_to
            FROM Nominee n WHERE n.asset_id = @asset_id AND {asof}
            """
            rows = list(snap.execute_sql(sql, params={"asset_id": asset_id, **p}, param_types={"asset_id": spanner.param_types.STRING, **pt}))
            keys = ["person_id", "asset_id", "case_id", "share_pct", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def list_all_records_by_case(case_id: str) -> list[dict[str, Any]]:
        """Return all historical and active nominee records for a case without as-of filtering."""
        def _list(snap: Snapshot):
            sql = """
            SELECT n.person_id, n.asset_id, n.case_id, n.share_pct, n.valid_from, n.valid_to, n.recorded_from, n.recorded_to
            FROM Nominee n WHERE n.case_id = @case_id
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["person_id", "asset_id", "case_id", "share_pct", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)


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
            results = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                if isinstance(d.get("packet"), str):
                    try:
                        d["packet"] = json.loads(d["packet"])
                    except Exception:
                        d["packet"] = {}
                results.append(d)
            return results
        return run_in_snapshot(_list)

    @staticmethod
    def get(claim_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT claim_id, case_id, asset_id, institution_id, route, status, status_reason,
                   amount_inr, packet, packet_gcs_uri, approved_by, submitted_at, due_at,
                   updated_at, computed_for_version
            FROM Claim WHERE claim_id = @claim_id
            """
            rows = list(snap.execute_sql(sql, params={"claim_id": claim_id}, param_types={"claim_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["claim_id", "case_id", "asset_id", "institution_id", "route", "status", "status_reason",
                    "amount_inr", "packet", "packet_gcs_uri", "approved_by", "submitted_at", "due_at",
                    "updated_at", "computed_for_version"]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d.get("packet"), str):
                try:
                    d["packet"] = json.loads(d["packet"])
                except Exception:
                    d["packet"] = {}
            return d
        return run_in_snapshot(_get)

    @staticmethod
    def save_claims(
        case_id: str,
        claims: list[dict[str, Any]],
        computed_for_version: int,
        actor: str = "ClaimsPackagerAgent",
    ) -> None:
        """Create or refresh claims for a case.
        
        Preserves SUBMITTED, IN_REVIEW, or SETTLED state on re-runs unless explicitly invalidated.
        """
        now = now_utc()

        def _tx(tx: Transaction):
            # Fetch existing claims for this case
            sql = """
            SELECT claim_id, asset_id, status, status_reason, approved_by, submitted_at, due_at
            FROM Claim WHERE case_id = @case_id
            """
            rows = list(tx.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            existing_by_asset = {r[1]: {
                "claim_id": r[0],
                "status": r[2],
                "status_reason": r[3],
                "approved_by": r[4],
                "submitted_at": r[5],
                "due_at": r[6],
            } for r in rows}

            columns = [
                "claim_id", "case_id", "asset_id", "institution_id", "route", "status",
                "status_reason", "amount_inr", "packet", "packet_gcs_uri", "approved_by",
                "submitted_at", "due_at", "updated_at", "computed_for_version"
            ]
            values = []

            for c in claims:
                aid = c["asset_id"]
                cid = c.get("claim_id") or (existing_by_asset.get(aid, {}).get("claim_id")) or str(uuid.uuid4())
                existing = existing_by_asset.get(aid)

                # Preserve state if already approved, submitted or settled unless invalidated
                if existing and existing.get("status") in ("APPROVED", "SUBMITTED", "IN_REVIEW", "SETTLED"):
                    if c.get("status") == "NEEDS_ACTION":
                        # Invalidated by case changes (e.g. active dispute opened, missing prerequisite doc)
                        final_status = "NEEDS_ACTION"
                        final_reason = f"Claim invalidated by case changes: {c.get('status_reason') or 'Prerequisite data modified'}"
                        final_app_by = None
                        final_sub_at = None
                        final_due_at = None
                        record_change(tx, case_id, "Claim", cid, "status", existing.get("status"), "NEEDS_ACTION", actor, now, now)
                        append_audit_entry(tx, case_id, actor, "claim_invalidated", {"claim_id": cid, "asset_id": aid, "reason": final_reason})
                    else:
                        final_status = existing["status"]
                        final_reason = existing.get("status_reason")
                        final_app_by = existing.get("approved_by")
                        final_sub_at = existing.get("submitted_at")
                        final_due_at = existing.get("due_at")
                else:
                    final_status = c.get("status", "READY")
                    final_reason = c.get("status_reason")
                    final_app_by = c.get("approved_by")
                    final_sub_at = c.get("submitted_at")
                    final_due_at = c.get("due_at")

                pkt = c.get("packet")
                pkt_json = json.dumps(pkt) if isinstance(pkt, (dict, list)) else (pkt or "{}")

                amt = c.get("amount_inr")
                amt_dec = Decimal(str(amt)) if amt is not None else None

                values.append([
                    cid,
                    case_id,
                    aid,
                    c.get("institution_id"),
                    c.get("route"),
                    final_status,
                    final_reason,
                    amt_dec,
                    pkt_json,
                    c.get("packet_gcs_uri"),
                    final_app_by,
                    final_sub_at,
                    final_due_at,
                    now,
                    computed_for_version,
                ])

            if values:
                tx.insert_or_update(table="Claim", columns=columns, values=values)
                append_audit_entry(tx, case_id, actor, "claims_refreshed", {"claims_count": len(values), "version": computed_for_version})

        run_in_transaction(_tx)

    @staticmethod
    def update_status(
        claim_id: str,
        status: str,
        status_reason: str | None = None,
        approved_by: str | None = None,
        submitted_at: datetime | None = None,
        due_at: datetime | None = None,
        actor: str = "system",
        payload_extra: dict[str, Any] | None = None,
        packet: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Update lifecycle status of a claim and write change + audit logs."""
        now = now_utc()
        result_holder: list[dict[str, Any]] = []

        def _tx(tx: Transaction):
            sql = """
            SELECT claim_id, case_id, asset_id, institution_id, route, status, status_reason,
                   amount_inr, packet, packet_gcs_uri, approved_by, submitted_at, due_at,
                   updated_at, computed_for_version
            FROM Claim WHERE claim_id = @claim_id
            """
            rows = list(tx.execute_sql(sql, params={"claim_id": claim_id}, param_types={"claim_id": spanner.param_types.STRING}))
            if not rows:
                return

            keys = ["claim_id", "case_id", "asset_id", "institution_id", "route", "status", "status_reason",
                    "amount_inr", "packet", "packet_gcs_uri", "approved_by", "submitted_at", "due_at",
                    "updated_at", "computed_for_version"]
            cur = dict(zip(keys, rows[0], strict=False))
            case_id = cur["case_id"]

            new_sub_at = submitted_at if submitted_at is not None else cur.get("submitted_at")
            new_due_at = due_at if due_at is not None else cur.get("due_at")
            new_app_by = approved_by if approved_by is not None else cur.get("approved_by")

            if packet is not None:
                packet_json = json.dumps(packet) if isinstance(packet, (dict, list)) else str(packet)
                sql_upd = """
                UPDATE Claim
                SET status = @status, status_reason = @reason, approved_by = @app_by,
                    submitted_at = @sub_at, due_at = @due_at, updated_at = @now,
                    packet = PARSE_JSON(@packet)
                WHERE claim_id = @cid
                """
                params = {
                    "status": status,
                    "reason": status_reason,
                    "app_by": new_app_by,
                    "sub_at": new_sub_at,
                    "due_at": new_due_at,
                    "now": now,
                    "cid": claim_id,
                    "packet": packet_json,
                }
                param_types = {
                    "status": spanner.param_types.STRING,
                    "reason": spanner.param_types.STRING,
                    "app_by": spanner.param_types.STRING,
                    "sub_at": spanner.param_types.TIMESTAMP,
                    "due_at": spanner.param_types.TIMESTAMP,
                    "now": spanner.param_types.TIMESTAMP,
                    "cid": spanner.param_types.STRING,
                    "packet": spanner.param_types.STRING,
                }
            else:
                sql_upd = """
                UPDATE Claim
                SET status = @status, status_reason = @reason, approved_by = @app_by,
                    submitted_at = @sub_at, due_at = @due_at, updated_at = @now
                WHERE claim_id = @cid
                """
                params = {
                    "status": status,
                    "reason": status_reason,
                    "app_by": new_app_by,
                    "sub_at": new_sub_at,
                    "due_at": new_due_at,
                    "now": now,
                    "cid": claim_id,
                }
                param_types = {
                    "status": spanner.param_types.STRING,
                    "reason": spanner.param_types.STRING,
                    "app_by": spanner.param_types.STRING,
                    "sub_at": spanner.param_types.TIMESTAMP,
                    "due_at": spanner.param_types.TIMESTAMP,
                    "now": spanner.param_types.TIMESTAMP,
                    "cid": spanner.param_types.STRING,
                }
            tx.execute_update(sql_upd, params=params, param_types=param_types)

            record_change(tx, case_id, "Claim", claim_id, "status", cur.get("status"), status, actor, now, now)
            audit_payload = {"claim_id": claim_id, "from_status": cur.get("status"), "to_status": status}
            if payload_extra:
                audit_payload.update(payload_extra)
            append_audit_entry(tx, case_id, actor, "claim_status_changed", audit_payload)

            cur["status"] = status
            cur["status_reason"] = status_reason
            cur["approved_by"] = new_app_by
            cur["submitted_at"] = new_sub_at
            cur["due_at"] = new_due_at
            cur["updated_at"] = now
            if isinstance(cur.get("packet"), str):
                try:
                    cur["packet"] = json.loads(cur["packet"])
                except Exception:
                    pass
            result_holder.append(cur)

        run_in_transaction(_tx)
        return result_holder[0] if result_holder else None


class InstitutionRepo:
    @staticmethod
    def list_all() -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = "SELECT institution_id, name, kind, required_docs, sla_days FROM Institution ORDER BY name"
            rows = list(snap.execute_sql(sql))
            keys = ["institution_id", "name", "kind", "required_docs", "sla_days"]
            res = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                if isinstance(d.get("required_docs"), str):
                    try:
                        d["required_docs"] = json.loads(d["required_docs"])
                    except Exception:
                        d["required_docs"] = {}
                res.append(d)
            return res
        return run_in_snapshot(_list)

    @staticmethod
    def get(institution_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = "SELECT institution_id, name, kind, required_docs, sla_days FROM Institution WHERE institution_id = @id"
            rows = list(snap.execute_sql(sql, params={"id": institution_id}, param_types={"id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["institution_id", "name", "kind", "required_docs", "sla_days"]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d.get("required_docs"), str):
                try:
                    d["required_docs"] = json.loads(d["required_docs"])
                except Exception:
                    d["required_docs"] = {}
            return d
        return run_in_snapshot(_get)


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
            res = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                if isinstance(d.get("evidence"), str):
                    try:
                        d["evidence"] = json.loads(d["evidence"])
                    except Exception:
                        pass
                res.append(d)
            return res
        return run_in_snapshot(_list)

    @staticmethod
    def get(dispute_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT dispute_id, case_id, kind, severity, title, evidence, evidence_hash,
                   recommended_action, status, computed_for_version
            FROM Dispute WHERE dispute_id = @did
            """
            rows = list(snap.execute_sql(sql, params={"did": dispute_id}, param_types={"did": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["dispute_id", "case_id", "kind", "severity", "title", "evidence", "evidence_hash",
                    "recommended_action", "status", "computed_for_version"]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d.get("evidence"), str):
                try:
                    d["evidence"] = json.loads(d["evidence"])
                except Exception:
                    pass
            return d
        return run_in_snapshot(_get)

    @staticmethod
    def save_disputes(
        case_id: str,
        new_disputes: list[dict[str, Any]],
        computed_for_version: int,
        actor: str = "system",
    ) -> list[dict[str, Any]]:
        """Persist disputes for a case version, preserving RESOLVED/ESCALATED state if evidence_hash matches."""
        now = now_utc()
        final_disputes: list[dict[str, Any]] = []

        def _tx(tx: Transaction):
            sql = """
            SELECT dispute_id, case_id, kind, severity, title, evidence, evidence_hash,
                   recommended_action, status, computed_for_version
            FROM Dispute WHERE case_id = @case_id
            """
            rows = list(tx.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["dispute_id", "case_id", "kind", "severity", "title", "evidence", "evidence_hash",
                    "recommended_action", "status", "computed_for_version"]
            existing_by_hash: dict[str, dict[str, Any]] = {}
            existing_ids: set[str] = set()
            for r in rows:
                ed = dict(zip(keys, r, strict=False))
                existing_ids.add(ed["dispute_id"])
                ehash = ed.get("evidence_hash")
                if ehash:
                    existing_by_hash[ehash] = ed

            current_ids: set[str] = set()
            values = []
            columns = [
                "dispute_id", "case_id", "kind", "severity", "title",
                "evidence", "evidence_hash", "recommended_action", "status",
                "computed_for_version",
            ]

            for d in new_disputes:
                ehash = d.get("evidence_hash", "")
                existing = existing_by_hash.get(ehash)

                # Re-run rule: never resurrect a RESOLVED dispute unless evidence_hash changed
                if existing:
                    did = existing["dispute_id"]
                    status = existing.get("status", "OPEN")
                else:
                    did = d.get("dispute_id") or f"disp-{uuid.uuid4().hex[:8]}"
                    status = d.get("status", "OPEN")

                current_ids.add(did)
                ev = d.get("evidence", {})
                ev_json = json.dumps(ev) if isinstance(ev, (dict, list)) else str(ev)

                row_dict = {
                    "dispute_id": did,
                    "case_id": case_id,
                    "kind": d.get("kind", "CONFLICTING_CLAIM"),
                    "severity": d.get("severity", "MEDIUM"),
                    "title": d.get("title", "Estate Dispute"),
                    "evidence": ev,
                    "evidence_hash": ehash,
                    "recommended_action": d.get("recommended_action", ""),
                    "status": status,
                    "computed_for_version": computed_for_version,
                }
                final_disputes.append(row_dict)

                values.append([
                    did,
                    case_id,
                    row_dict["kind"],
                    row_dict["severity"],
                    row_dict["title"],
                    ev_json,
                    ehash,
                    row_dict["recommended_action"],
                    status,
                    computed_for_version,
                ])

            # Prune stale disputes whose underlying basis has been removed
            # (e.g. deleting Vikram's affidavit removes document-based findings)
            stale_ids = existing_ids - current_ids
            if stale_ids:
                keys_to_del = spanner.KeySet(keys=[[sid] for sid in stale_ids])
                tx.delete("Dispute", keys_to_del)

            if values:
                tx.insert_or_update(table="Dispute", columns=columns, values=values)
            append_audit_entry(tx, case_id, actor, "disputes_refreshed", {"count": len(values), "version": computed_for_version})

        run_in_transaction(_tx)
        return final_disputes

    @staticmethod
    def update_status(
        dispute_id: str,
        status: str,
        action: str,
        note: str,
        actor: str = "system",
    ) -> dict[str, Any] | None:
        """Update dispute status and log audit."""
        now = now_utc()
        result_holder: list[dict[str, Any]] = []

        def _tx(tx: Transaction):
            sql = """
            SELECT dispute_id, case_id, kind, severity, title, evidence, evidence_hash,
                   recommended_action, status, computed_for_version
            FROM Dispute WHERE dispute_id = @did
            """
            rows = list(tx.execute_sql(sql, params={"did": dispute_id}, param_types={"did": spanner.param_types.STRING}))
            if not rows:
                return
            keys = ["dispute_id", "case_id", "kind", "severity", "title", "evidence", "evidence_hash",
                    "recommended_action", "status", "computed_for_version"]
            cur = dict(zip(keys, rows[0], strict=False))
            case_id = cur["case_id"]

            ver = bump_case_version(tx, case_id)
            sql_upd = """
            UPDATE Dispute
            SET status = @status, computed_for_version = @ver
            WHERE dispute_id = @did
            """
            tx.execute_update(
                sql_upd,
                params={"status": status, "ver": ver, "did": dispute_id},
                param_types={"status": spanner.param_types.STRING, "ver": spanner.param_types.INT64, "did": spanner.param_types.STRING},
            )

            record_change(tx, case_id, "Dispute", dispute_id, "status", cur.get("status"), status, actor, now, now)
            append_audit_entry(tx, case_id, actor, "dispute_resolved", {
                "dispute_id": dispute_id,
                "action": action,
                "from_status": cur.get("status"),
                "to_status": status,
                "note": note,
            })

            cur["status"] = status
            cur["computed_for_version"] = ver
            if isinstance(cur.get("evidence"), str):
                try:
                    cur["evidence"] = json.loads(cur["evidence"])
                except Exception:
                    pass
            result_holder.append(cur)

        run_in_transaction(_tx)
        return result_holder[0] if result_holder else None


class DocRequestRepo:
    @staticmethod
    def create(data: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        case_id = data["case_id"]
        req_id = data.get("request_id") or f"req-{uuid.uuid4().hex[:8]}"
        now = now_utc()
        created_at = data.get("created_at") or now

        def _tx(tx: Transaction):
            ver = bump_case_version(tx, case_id)
            tx.insert_or_update(
                table="DocRequest",
                columns=["request_id", "case_id", "claim_id", "doc_name", "status", "created_at"],
                values=[[req_id, case_id, data.get("claim_id"), data["doc_name"], data.get("status", "PENDING"), created_at]],
            )
            append_audit_entry(tx, case_id, actor, "doc_request_created", {
                "request_id": req_id,
                "doc_name": data["doc_name"],
                "claim_id": data.get("claim_id"),
            })

        run_in_transaction(_tx)
        return {
            "request_id": req_id,
            "case_id": case_id,
            "claim_id": data.get("claim_id"),
            "doc_name": data["doc_name"],
            "status": data.get("status", "PENDING"),
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        }

    @staticmethod
    def list_by_case(case_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = "SELECT request_id, case_id, claim_id, doc_name, status, created_at FROM DocRequest WHERE case_id = @case_id ORDER BY created_at"
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            keys = ["request_id", "case_id", "claim_id", "doc_name", "status", "created_at"]
            return [dict(zip(keys, r, strict=False)) for r in rows]
        return run_in_snapshot(_list)

    @staticmethod
    def list_by_claim(claim_id: str) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = "SELECT request_id, case_id, claim_id, doc_name, status, created_at FROM DocRequest WHERE claim_id = @claim_id ORDER BY created_at"
            rows = list(snap.execute_sql(sql, params={"claim_id": claim_id}, param_types={"claim_id": spanner.param_types.STRING}))
            keys = ["request_id", "case_id", "claim_id", "doc_name", "status", "created_at"]
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

    @staticmethod
    def upsert(data: dict[str, Any], actor: str = "system") -> tuple[dict[str, Any], int]:
        return ConsentRepo.upsert_status(
            case_id=data["case_id"],
            person_id=data["person_id"],
            status=data["status"],
            actor=actor,
        )


class ChangeLogRepo:
    @staticmethod
    def list_by_case(case_id: str, limit: int = 50) -> list[dict[str, Any]]:
        def _read(snap: Snapshot) -> list[dict[str, Any]]:
            sql = """
            SELECT change_id, case_id, entity, entity_id, field, old_value, new_value, valid_at, recorded_at, actor
            FROM ChangeLog
            WHERE case_id = @case_id
            ORDER BY recorded_at DESC
            LIMIT @limit
            """
            rows = list(snap.execute_sql(
                sql,
                params={"case_id": case_id, "limit": limit},
                param_types={"case_id": spanner.param_types.STRING, "limit": spanner.param_types.INT64},
            ))
            results = []
            for r in rows:
                results.append({
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
                })
            return results
        return run_in_snapshot(_read)

    @staticmethod
    def list_since(case_id: str, since_ts: datetime) -> list[dict[str, Any]]:
        def _read(snap: Snapshot) -> list[dict[str, Any]]:
            sql = """
            SELECT change_id, case_id, entity, entity_id, field, old_value, new_value, valid_at, recorded_at, actor
            FROM ChangeLog
            WHERE case_id = @case_id AND recorded_at >= @since_ts
            ORDER BY recorded_at ASC
            """
            rows = list(snap.execute_sql(
                sql,
                params={"case_id": case_id, "since_ts": since_ts},
                param_types={"case_id": spanner.param_types.STRING, "since_ts": spanner.param_types.TIMESTAMP},
            ))
            results = []
            for r in rows:
                results.append({
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
                })
            return results
        return run_in_snapshot(_read)


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

    list_by_case_scenario = list_by_case_and_scenario

    @staticmethod
    def list_by_case(case_id: str, scenario: str = "current") -> list[dict[str, Any]]:
        return ShareResultRepo.list_by_case_and_scenario(case_id, scenario)

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

    @staticmethod
    def delete(doc_id_or_case_id: str, doc_id: str | None = None, actor: str = "system") -> int:
        """Soft delete a document by doc_id (supports delete(doc_id) and delete(case_id, doc_id))."""
        if doc_id is None:
            target_did = doc_id_or_case_id
            doc = DocumentRepo.get(target_did)
            if not doc:
                return 0
            cid = doc["case_id"]
            return DocumentRepo.soft_delete(cid, target_did, actor=actor)
        return DocumentRepo.soft_delete(doc_id_or_case_id, doc_id, actor=actor)


# ---------------------------------------------------------------------------
# AgentRun Repository
# ---------------------------------------------------------------------------
class AgentRunRepo:
    @staticmethod
    def create(case_id: str, trigger_kind: str = "manual", case_version: int = 1) -> dict[str, Any]:
        run_id = str(uuid.uuid4())
        now = now_utc()
        row = {
            "run_id": run_id,
            "case_id": case_id,
            "trigger_kind": trigger_kind,
            "status": "QUEUED",
            "degraded": False,
            "rerun_pending": False,
            "case_version": case_version,
            "started_at": now,
            "finished_at": None,
            "metrics": json.dumps({}),
        }

        def _tx(tx: Transaction):
            sql = """
            INSERT INTO AgentRun (run_id, case_id, trigger_kind, status, degraded, rerun_pending, case_version, started_at, finished_at, metrics)
            VALUES (@run_id, @case_id, @trigger_kind, @status, @degraded, @rerun_pending, @case_version, @started_at, @finished_at, PARSE_JSON(@metrics))
            """
            tx.execute_update(sql, params=row, param_types={
                "run_id": spanner.param_types.STRING,
                "case_id": spanner.param_types.STRING,
                "trigger_kind": spanner.param_types.STRING,
                "status": spanner.param_types.STRING,
                "degraded": spanner.param_types.BOOL,
                "rerun_pending": spanner.param_types.BOOL,
                "case_version": spanner.param_types.INT64,
                "started_at": spanner.param_types.TIMESTAMP,
                "finished_at": spanner.param_types.TIMESTAMP,
                "metrics": spanner.param_types.STRING,
            })

        run_in_transaction(_tx)
        row["metrics"] = {}
        return row

    @staticmethod
    def get(run_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT run_id, case_id, trigger_kind, status, degraded, rerun_pending, case_version, started_at, finished_at, metrics
            FROM AgentRun WHERE run_id = @run_id
            """
            rows = list(snap.execute_sql(sql, params={"run_id": run_id}, param_types={"run_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["run_id", "case_id", "trigger_kind", "status", "degraded", "rerun_pending", "case_version", "started_at", "finished_at", "metrics"]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d["metrics"], str):
                try:
                    d["metrics"] = json.loads(d["metrics"])
                except Exception:
                    pass
            return d
        return run_in_snapshot(_get)

    @staticmethod
    def get_active_by_case(case_id: str) -> dict[str, Any] | None:
        def _get(snap: Snapshot):
            sql = """
            SELECT run_id, case_id, trigger_kind, status, degraded, rerun_pending, case_version, started_at, finished_at, metrics
            FROM AgentRun WHERE case_id = @case_id AND status IN ('QUEUED', 'RUNNING')
            ORDER BY started_at DESC LIMIT 1
            """
            rows = list(snap.execute_sql(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
            if not rows:
                return None
            keys = ["run_id", "case_id", "trigger_kind", "status", "degraded", "rerun_pending", "case_version", "started_at", "finished_at", "metrics"]
            d = dict(zip(keys, rows[0], strict=False))
            if isinstance(d["metrics"], str):
                try:
                    d["metrics"] = json.loads(d["metrics"])
                except Exception:
                    pass
            return d
        return run_in_snapshot(_get)

    @staticmethod
    def update_status(run_id: str, status: str, degraded: bool = False, metrics: dict[str, Any] | None = None) -> None:
        now = now_utc()
        def _tx(tx: Transaction):
            finished_at = now if status in ("DONE", "FAILED") else None
            sql = """
            UPDATE AgentRun
            SET status = @status,
                degraded = @degraded,
                finished_at = @finished_at,
                metrics = PARSE_JSON(@metrics)
            WHERE run_id = @run_id
            """
            params = {
                "run_id": run_id,
                "status": status,
                "degraded": degraded,
                "finished_at": finished_at,
                "metrics": json.dumps(metrics or {}),
            }
            param_types = {
                "run_id": spanner.param_types.STRING,
                "status": spanner.param_types.STRING,
                "degraded": spanner.param_types.BOOL,
                "finished_at": spanner.param_types.TIMESTAMP,
                "metrics": spanner.param_types.STRING,
            }
            tx.execute_update(sql, params=params, param_types=param_types)
        run_in_transaction(_tx)

    @staticmethod
    def set_rerun_pending(run_id: str, pending: bool = True) -> None:
        def _tx(tx: Transaction):
            sql = "UPDATE AgentRun SET rerun_pending = @pending WHERE run_id = @run_id"
            tx.execute_update(sql, params={"run_id": run_id, "pending": pending}, param_types={"run_id": spanner.param_types.STRING, "pending": spanner.param_types.BOOL})
        run_in_transaction(_tx)


# ---------------------------------------------------------------------------
# AgentEvent Repository
# ---------------------------------------------------------------------------
class AgentEventRepo:
    @staticmethod
    def append_event(
        run_id: str,
        event_type: str,
        agent: str = "",
        message: str = "",
        citations: list[str] | None = None,
        progress: float = 0.0,
        degraded: bool = False,
        payload: dict[str, Any] | None = None,
    ) -> int:
        now = now_utc()
        seq_holder: list[int] = []

        def _tx(tx: Transaction):
            # Compute next seq
            sql_max = "SELECT COALESCE(MAX(seq), 0) FROM AgentEvent WHERE run_id = @run_id"
            rows = list(tx.execute_sql(sql_max, params={"run_id": run_id}, param_types={"run_id": spanner.param_types.STRING}))
            next_seq = rows[0][0] + 1
            seq_holder.append(next_seq)

            sql_ins = """
            INSERT INTO AgentEvent (run_id, seq, ts, agent, event_type, message, citations, progress, degraded, payload)
            VALUES (@run_id, @seq, @ts, @agent, @event_type, @message, PARSE_JSON(@citations), @progress, @degraded, PARSE_JSON(@payload))
            """
            params = {
                "run_id": run_id,
                "seq": next_seq,
                "ts": now,
                "agent": agent,
                "event_type": event_type,
                "message": message,
                "citations": json.dumps(citations or []),
                "progress": float(progress),
                "degraded": bool(degraded),
                "payload": json.dumps(payload or {}),
            }
            param_types = {
                "run_id": spanner.param_types.STRING,
                "seq": spanner.param_types.INT64,
                "ts": spanner.param_types.TIMESTAMP,
                "agent": spanner.param_types.STRING,
                "event_type": spanner.param_types.STRING,
                "message": spanner.param_types.STRING,
                "citations": spanner.param_types.STRING,
                "progress": spanner.param_types.FLOAT64,
                "degraded": spanner.param_types.BOOL,
                "payload": spanner.param_types.STRING,
            }
            tx.execute_update(sql_ins, params=params, param_types=param_types)

        run_in_transaction(_tx)
        return seq_holder[0] if seq_holder else 1

    @staticmethod
    def list_events_after(run_id: str, after_seq: int = 0) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT run_id, seq, ts, agent, event_type, message, citations, progress, degraded, payload
            FROM AgentEvent
            WHERE run_id = @run_id AND seq > @after_seq
            ORDER BY seq ASC
            """
            rows = list(snap.execute_sql(
                sql,
                params={"run_id": run_id, "after_seq": after_seq},
                param_types={"run_id": spanner.param_types.STRING, "after_seq": spanner.param_types.INT64},
            ))
            keys = ["run_id", "seq", "ts", "agent", "event_type", "message", "citations", "progress", "degraded", "payload"]
            results = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                if isinstance(d["citations"], str):
                    try:
                        d["citations"] = json.loads(d["citations"])
                    except Exception:
                        d["citations"] = []
                elif d["citations"] is None:
                    d["citations"] = []
                if isinstance(d["payload"], str):
                    try:
                        d["payload"] = json.loads(d["payload"])
                    except Exception:
                        d["payload"] = {}
                elif d["payload"] is None:
                    d["payload"] = {}
                if isinstance(d["ts"], datetime):
                    d["ts"] = d["ts"].isoformat()
                results.append(d)
            return results
        return run_in_snapshot(_list)


# ---------------------------------------------------------------------------
# ChatMessage Repository
# ---------------------------------------------------------------------------
class ChatMessageRepo:
    @staticmethod
    def append_message(
        case_id: str,
        role: str,
        content: str,
        citations: list[Any] | None = None,
        entity_links: list[dict[str, Any]] | None = None,
    ) -> int:
        now = now_utc()
        seq_holder: list[int] = []

        def _tx(tx: Transaction):
            sql_seq = "SELECT COALESCE(MAX(seq), 0) + 1 FROM ChatMessage WHERE case_id = @case_id"
            rows = list(tx.execute_sql(
                sql_seq,
                params={"case_id": case_id},
                param_types={"case_id": spanner.param_types.STRING},
            ))
            next_seq = int(rows[0][0]) if rows and rows[0][0] is not None else 1
            seq_holder.append(next_seq)

            sql_ins = """
            INSERT INTO ChatMessage (case_id, seq, role, content, citations, entity_links, ts)
            VALUES (@case_id, @seq, @role, @content, PARSE_JSON(@citations), PARSE_JSON(@entity_links), @ts)
            """
            params = {
                "case_id": case_id,
                "seq": next_seq,
                "role": role,
                "content": content,
                "citations": json.dumps(citations or [], default=str),
                "entity_links": json.dumps(entity_links or [], default=str),
                "ts": now,
            }
            param_types = {
                "case_id": spanner.param_types.STRING,
                "seq": spanner.param_types.INT64,
                "role": spanner.param_types.STRING,
                "content": spanner.param_types.STRING,
                "citations": spanner.param_types.STRING,
                "entity_links": spanner.param_types.STRING,
                "ts": spanner.param_types.TIMESTAMP,
            }
            tx.execute_update(sql_ins, params=params, param_types=param_types)

        run_in_transaction(_tx)
        return seq_holder[0] if seq_holder else 1

    @staticmethod
    def list_by_case(case_id: str, limit: int = 50) -> list[dict[str, Any]]:
        def _list(snap: Snapshot):
            sql = """
            SELECT case_id, seq, role, content, citations, entity_links, ts
            FROM ChatMessage
            WHERE case_id = @case_id
            ORDER BY seq ASC
            """
            rows = list(snap.execute_sql(
                sql,
                params={"case_id": case_id},
                param_types={"case_id": spanner.param_types.STRING},
            ))
            keys = ["case_id", "seq", "role", "content", "citations", "entity_links", "ts"]
            results = []
            for r in rows:
                d = dict(zip(keys, r, strict=False))
                for json_col in ("citations", "entity_links"):
                    if isinstance(d.get(json_col), str):
                        try:
                            d[json_col] = json.loads(d[json_col])
                        except Exception:
                            d[json_col] = []
                    elif d.get(json_col) is None:
                        d[json_col] = []
                if isinstance(d["ts"], datetime):
                    d["ts"] = d["ts"].isoformat()
                results.append(d)
            if len(results) > limit:
                results = results[-limit:]
            return results

        return run_in_snapshot(_list)

    @staticmethod
    def delete_by_case(case_id: str) -> None:
        def _tx(tx: Transaction):
            sql = "DELETE FROM ChatMessage WHERE case_id = @case_id"
            tx.execute_update(sql, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING})
        run_in_transaction(_tx)



