"""Session cloning and lifecycle management service for Virasat.

Manages private ephemeral user sessions cloned from 'sharma' or 'mehta' seed templates.
"""

import json
import logging
import uuid
from datetime import timedelta
from typing import Any

from google.cloud import spanner, storage
from google.cloud.spanner_v1.snapshot import Snapshot
from google.cloud.spanner_v1.transaction import Transaction

from app.config import get_settings
from app.db.audit import append_audit_entry
from app.db.bitemporal import SENTINEL_MAX_TIMESTAMP, now_utc
from app.db.client import run_in_snapshot, run_in_transaction
from app.errors import Forbidden, NotFound

logger = logging.getLogger(__name__)


def _copy_gcs_docs(source_prefix: str, target_prefix: str, bucket_name: str) -> None:
    """Copy GCS objects from source_prefix to target_prefix."""
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blobs = list(bucket.list_blobs(prefix=source_prefix))
        for blob in blobs:
            dest_name = blob.name.replace(source_prefix, target_prefix, 1)
            bucket.copy_blob(blob, bucket, dest_name)
    except Exception as e:
        logger.warning(f"Could not copy GCS objects from {source_prefix} to {target_prefix}: {e}")


def _delete_gcs_prefix(prefix: str, bucket_name: str) -> None:
    """Delete all GCS objects matching prefix."""
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blobs = list(bucket.list_blobs(prefix=prefix))
        for blob in blobs:
            blob.delete()
    except Exception as e:
        logger.warning(f"Could not delete GCS objects under {prefix}: {e}")


def clone_seed(seed_key: str, uid: str, mode: str = "prefilled", copy_storage: bool = True) -> str:
    """Clone a seed case template into a new isolated case owned by uid.

    Returns the new case_id.
    """
    if seed_key not in ("sharma", "mehta"):
        raise NotFound(f"Unknown seed scenario '{seed_key}'. Expected 'sharma' or 'mehta'.")

    seed_case_id = f"seed-{seed_key}"
    settings = get_settings()
    now = now_utc()
    expires_at = now + timedelta(hours=settings.SESSION_TTL_HOURS)
    new_case_id = str(uuid.uuid4())

    # 1. Fetch seed rows in a read-only snapshot
    def _read_seed(snap: Snapshot) -> dict[str, Any]:
        # Case
        c_rows = list(snap.execute_sql(
            "SELECT title, deceased_person_id FROM Cases WHERE case_id = @cid",
            params={"cid": seed_case_id},
            param_types={"cid": spanner.param_types.STRING},
        ))
        if not c_rows:
            raise NotFound(f"Seed case '{seed_case_id}' not found in database. Run scripts/seed.py first.")
        seed_title, seed_dec_id = c_rows[0][0], c_rows[0][1]

        # People
        p_sql = """
        SELECT person_id, full_name, role, sex, dob, dod, personal_law, alive, eligibility, notes
        FROM Person WHERE case_id = @cid AND deleted = FALSE ORDER BY person_id
        """
        people = list(snap.execute_sql(p_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Relationships
        r_sql = """
        SELECT from_id, to_id, rel_type, valid_from, valid_to, recorded_from, recorded_to
        FROM Relationship WHERE case_id = @cid
        """
        relationships = list(snap.execute_sql(r_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Assets
        a_sql = """
        SELECT asset_id, institution_id, type, label, account_ref_masked, est_value_inr,
               ownership, source_doc_id, extraction_confidence, status
        FROM Asset WHERE case_id = @cid AND deleted = FALSE ORDER BY asset_id
        """
        assets = list(snap.execute_sql(a_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Nominees
        n_sql = """
        SELECT person_id, asset_id, share_pct, valid_from, valid_to, recorded_from, recorded_to
        FROM Nominee WHERE case_id = @cid
        """
        nominees = list(snap.execute_sql(n_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Will
        w_sql = """
        SELECT will_id, doc_id, status, executed_on, bequests
        FROM Will WHERE case_id = @cid
        """
        will_rows = list(snap.execute_sql(w_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Consent
        con_sql = "SELECT person_id, status, signed_at FROM Consent WHERE case_id = @cid"
        consent_rows = list(snap.execute_sql(con_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        # Documents
        d_sql = """
        SELECT doc_id, gcs_uri, doc_type, original_name, extracted, field_confidence, status, verified, degraded
        FROM Document WHERE case_id = @cid AND deleted = FALSE ORDER BY doc_id
        """
        docs = list(snap.execute_sql(d_sql, params={"cid": seed_case_id}, param_types={"cid": spanner.param_types.STRING}))

        return {
            "title": seed_title,
            "deceased_id": seed_dec_id,
            "people": people,
            "relationships": relationships,
            "assets": assets,
            "nominees": nominees,
            "will": will_rows[0] if will_rows else None,
            "consent": consent_rows,
            "docs": docs,
        }

    seed_data = run_in_snapshot(_read_seed)

    # 2. Build ID mapping tables to isolate the clone completely
    prefix = new_case_id[:8]
    person_map: dict[str, str] = {}
    for p in seed_data["people"]:
        old_pid = p[0]
        # Keep clean recognizable ID: p-<prefix>-<suffix>
        suffix = old_pid.replace("p-sharma-", "").replace("p-mehta-", "")
        person_map[old_pid] = f"p-{prefix}-{suffix}"

    asset_map: dict[str, str] = {}
    for a in seed_data["assets"]:
        old_aid = a[0]
        suffix = old_aid.replace("a-sharma-", "").replace("a-mehta-", "")
        asset_map[old_aid] = f"a-{prefix}-{suffix}"

    doc_map: dict[str, str] = {}
    for d in seed_data["docs"]:
        old_did = d[0]
        suffix = old_did.replace("doc-sharma-", "").replace("doc-mehta-", "")
        doc_map[old_did] = f"doc-{prefix}-{suffix}"

    new_deceased_id = person_map.get(seed_data["deceased_id"], seed_data["deceased_id"])

    # 3. Write cloned rows in a transaction
    def _write_clone(tx: Transaction):
        # Insert Cases
        c_cols = ["case_id", "owner_uid", "seed_key", "mode", "title", "status", "deceased_person_id", "data_version", "created_at", "expires_at"]
        c_vals = [[
            new_case_id,
            uid,
            seed_key,
            mode,
            seed_data["title"],
            "in_progress",
            new_deceased_id,
            1,
            now,
            expires_at,
        ]]
        tx.insert_or_update(table="Cases", columns=c_cols, values=c_vals)

        # Insert People
        p_cols = ["person_id", "case_id", "full_name", "role", "sex", "dob", "dod", "personal_law", "alive", "eligibility", "notes", "deleted"]
        p_vals = []
        for p in seed_data["people"]:
            p_vals.append([
                person_map[p[0]],
                new_case_id,
                p[1],
                p[2],
                p[3],
                p[4],
                p[5],
                p[6],
                p[7],
                p[8],
                p[9],
                False,
            ])
        tx.insert_or_update(table="Person", columns=p_cols, values=p_vals)

        # Insert Relationships (preserving bi-temporal timestamps)
        r_cols = ["from_id", "to_id", "rel_type", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"]
        r_vals = []
        for r in seed_data["relationships"]:
            r_vals.append([
                person_map.get(r[0], r[0]),
                person_map.get(r[1], r[1]),
                r[2],
                new_case_id,
                r[3],
                r[4],
                r[5],
                r[6],
            ])
        tx.insert_or_update(table="Relationship", columns=r_cols, values=r_vals)

        # In prefilled mode, copy Assets, Nominees, HeldAt, Owns
        if mode == "prefilled":
            a_cols = ["asset_id", "case_id", "institution_id", "type", "label", "account_ref_masked", "est_value_inr", "ownership", "source_doc_id", "extraction_confidence", "status", "deleted"]
            a_vals = []
            held_vals = []
            owns_vals = []
            for a in seed_data["assets"]:
                new_aid = asset_map[a[0]]
                a_vals.append([
                    new_aid,
                    new_case_id,
                    a[1],
                    a[2],
                    a[3],
                    a[4],
                    a[5],
                    a[6],
                    doc_map.get(a[7]),
                    a[8],
                    a[9],
                    False,
                ])
                held_vals.append([new_aid, a[1], new_case_id])
                owns_vals.append([
                    new_deceased_id,
                    new_aid,
                    new_case_id,
                    now,
                    SENTINEL_MAX_TIMESTAMP,
                    now,
                    SENTINEL_MAX_TIMESTAMP,
                ])
            tx.insert_or_update(table="Asset", columns=a_cols, values=a_vals)
            tx.insert_or_update(table="HeldAt", columns=["asset_id", "institution_id", "case_id"], values=held_vals)
            tx.insert_or_update(table="Owns", columns=["person_id", "asset_id", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"], values=owns_vals)

            # Insert Nominees (preserving exact bi-temporal history, e.g. HDFC split)
            nom_cols = ["person_id", "asset_id", "case_id", "share_pct", "valid_from", "valid_to", "recorded_from", "recorded_to"]
            nom_vals = []
            for n in seed_data["nominees"]:
                nom_vals.append([
                    person_map.get(n[0], n[0]),
                    asset_map.get(n[1], n[1]),
                    new_case_id,
                    n[2],
                    n[3],
                    n[4],
                    n[5],
                    n[6],
                ])
            tx.insert_or_update(table="Nominee", columns=nom_cols, values=nom_vals)

        # Insert Will
        if seed_data["will"]:
            w = seed_data["will"]
            new_wid = f"will-{prefix}"
            raw_bequests = w[4]
            bequests_list = json.loads(raw_bequests) if isinstance(raw_bequests, str) else (raw_bequests or [])
            cloned_bequests = []
            for b in bequests_list:
                cloned_bequests.append({
                    "person_id": person_map.get(b.get("person_id"), b.get("person_id")),
                    "asset_id": asset_map.get(b.get("asset_id")) if b.get("asset_id") else None,
                    "share_pct": b.get("share_pct", 0),
                })
            w_cols = ["will_id", "case_id", "doc_id", "status", "executed_on", "bequests"]
            w_vals = [[
                new_wid,
                new_case_id,
                doc_map.get(w[1]),
                w[2],
                w[3],
                json.dumps(cloned_bequests),
            ]]
            tx.insert_or_update(table="Will", columns=w_cols, values=w_vals)

        # Insert Consent
        if seed_data["consent"]:
            con_cols = ["case_id", "person_id", "status", "signed_at"]
            con_vals = []
            for c in seed_data["consent"]:
                con_vals.append([
                    new_case_id,
                    person_map.get(c[0], c[0]),
                    c[1],
                    c[2],
                ])
            tx.insert_or_update(table="Consent", columns=con_cols, values=con_vals)

        # Insert Documents
        d_cols = ["doc_id", "case_id", "gcs_uri", "doc_type", "original_name", "extracted", "field_confidence", "status", "verified", "degraded", "uploaded_at", "deleted"]
        d_vals = []
        for d in seed_data["docs"]:
            old_did = d[0]
            new_did = doc_map[old_did]
            fname = d[3]
            ext = fname.split(".")[-1]
            cloned_gcs_uri = f"gs://{settings.GCS_BUCKET}/cases/{new_case_id}/docs/{new_did}.{ext}"
            d_vals.append([
                new_did,
                new_case_id,
                cloned_gcs_uri,
                d[2],
                fname,
                d[4],
                d[5],
                d[6],
                d[7],
                d[8],
                now,
                False,
            ])
        tx.insert_or_update(table="Document", columns=d_cols, values=d_vals)

        # Append AuditLog entry
        append_audit_entry(
            tx,
            new_case_id,
            uid,
            "case created from seed",
            {"seed_key": seed_key, "mode": mode, "source_case": seed_case_id},
        )

    run_in_transaction(_write_clone)

    # 4. Copy GCS document objects to cases/<new_case_id>/docs/
    if copy_storage:
        _copy_gcs_docs(
            source_prefix=f"seed/{seed_key}/",
            target_prefix=f"cases/{new_case_id}/docs/",
            bucket_name=settings.GCS_BUCKET,
        )

    logger.info(f"Cloned seed case '{seed_key}' into '{new_case_id}' for user '{uid}' (mode: {mode}).")
    return new_case_id


def delete_case_records(tx: Transaction, case_id: str) -> None:
    """Delete all records associated with case_id across all Spanner tables."""
    # Delete AgentEvent first via run_id subquery since AgentEvent has no case_id column
    tx.execute_update(
        "DELETE FROM AgentEvent WHERE run_id IN (SELECT run_id FROM AgentRun WHERE case_id = @cid)",
        params={"cid": case_id},
        param_types={"cid": spanner.param_types.STRING},
    )

    tables = [
        "AgentRun", "ChatMessage", "AuditLog", "ChangeLog",
        "ShareResult", "Claim", "Dispute", "Consent", "Will", "DocRequest",
        "Document", "Nominee", "Owns", "HeldAt", "Asset", "Relationship",
        "Person", "Cases",
    ]
    for tbl in tables:
        tx.execute_update(
            f"DELETE FROM {tbl} WHERE case_id = @cid",
            params={"cid": case_id},
            param_types={"cid": spanner.param_types.STRING},
        )


def reset_case(case_id: str, uid: str) -> dict[str, str]:
    """Reset a case by deleting it and re-cloning from its seed template."""
    def _get_case(snap: Snapshot) -> dict[str, Any] | None:
        rows = list(snap.execute_sql(
            "SELECT owner_uid, seed_key, mode FROM Cases WHERE case_id = @cid",
            params={"cid": case_id},
            param_types={"cid": spanner.param_types.STRING},
        ))
        if not rows:
            return None
        return {"owner_uid": rows[0][0], "seed_key": rows[0][1], "mode": rows[0][2]}

    case_info = run_in_snapshot(_get_case)
    if not case_info:
        raise NotFound(f"Case '{case_id}' not found.")

    if case_info["owner_uid"] == "SEED":
        raise Forbidden("Seed templates are read-only and cannot be reset.")

    if case_info["owner_uid"] != uid:
        raise Forbidden("You can only reset cases that you own.")

    seed_key = case_info["seed_key"] or "sharma"
    mode = case_info["mode"] or "prefilled"

    # Delete Spanner rows
    def _tx(tx: Transaction):
        delete_case_records(tx, case_id)
    run_in_transaction(_tx)

    # Delete GCS docs
    settings = get_settings()
    _delete_gcs_prefix(f"cases/{case_id}/", settings.GCS_BUCKET)

    # Re-clone fresh session
    new_case_id = clone_seed(seed_key=seed_key, uid=uid, mode=mode)
    return {"case_id": new_case_id, "status": "reset"}


def cleanup_expired_sessions() -> int:
    """Delete all expired ephemeral sessions and their GCS storage."""
    now = now_utc()

    def _get_expired(snap: Snapshot) -> list[str]:
        sql = """
        SELECT case_id FROM Cases
        WHERE expires_at IS NOT NULL AND expires_at < @now AND owner_uid != 'SEED'
        """
        rows = list(snap.execute_sql(sql, params={"now": now}, param_types={"now": spanner.param_types.TIMESTAMP}))
        return [r[0] for r in rows]

    expired_ids = run_in_snapshot(_get_expired)
    settings = get_settings()

    for cid in expired_ids:
        target_cid = cid
        run_in_transaction(lambda tx, t_cid=target_cid: delete_case_records(tx, t_cid))
        _delete_gcs_prefix(f"cases/{cid}/", settings.GCS_BUCKET)

    return len(expired_ids)
