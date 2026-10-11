"""Database seed script for Virasat.

Idempotently seeds global Institutions and the two canonical seed cases:
- "sharma": VR-2026-0142 (Ramesh Sharma, 12 assets netting 28,400,000 INR)
- "mehta": VR-2026-0187 (Anil Mehta, 8 assets netting 16,780,000 INR)
"""

import json
import sys
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google.cloud.spanner_v1.transaction import Transaction

from app.config import get_settings
from app.db.bitemporal import SENTINEL_MAX_TIMESTAMP
from app.db.client import run_in_transaction
from app.seed.data import INSTITUTIONS, MEHTA_SEED, SHARMA_SEED


def parse_iso(val: str | datetime | None) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    return datetime.fromisoformat(val.replace("Z", "+00:00"))


def seed_institutions(tx: Transaction):
    """Upsert global institutions."""
    cols = ["institution_id", "name", "kind", "required_docs", "sla_days"]
    vals = []
    for inst in INSTITUTIONS:
        vals.append([
            inst["institution_id"],
            inst["name"],
            inst["kind"],
            json.dumps(inst["required_docs"]),
            inst["sla_days"],
        ])
    tx.insert_or_update(table="Institution", columns=cols, values=vals)
    print(f"Upserted {len(vals)} institutions.")


def seed_case_data(tx: Transaction, spec: dict[str, Any]):
    """Idempotently seed a complete case scenario."""
    settings = get_settings()
    bucket_name = settings.GCS_BUCKET
    c = spec["case"]
    case_id = c["case_id"]
    seed_key = c["seed_key"]
    now = datetime.now(UTC)

    # 1. Cases table
    c_cols = ["case_id", "owner_uid", "seed_key", "mode", "title", "status", "deceased_person_id", "data_version", "created_at", "expires_at"]
    c_vals = [[
        case_id,
        c["owner_uid"],
        c["seed_key"],
        c.get("mode", "prefilled"),
        c["title"],
        c["status"],
        c["deceased_person_id"],
        c.get("data_version", 1),
        now,
        None,  # Seed cases never expire
    ]]
    tx.insert_or_update(table="Cases", columns=c_cols, values=c_vals)

    # 2. Person table
    p_cols = ["person_id", "case_id", "full_name", "role", "sex", "dob", "dod", "personal_law", "alive", "eligibility", "notes", "deleted"]
    p_vals = []
    for p in spec["people"]:
        dob_d = datetime.strptime(p["dob"], "%Y-%m-%d").date() if p.get("dob") else None
        dod_d = datetime.strptime(p["dod"], "%Y-%m-%d").date() if p.get("dod") else None
        p_vals.append([
            p["person_id"],
            case_id,
            p["full_name"],
            p["role"],
            p.get("sex"),
            dob_d,
            dod_d,
            p.get("personal_law"),
            p.get("alive", True),
            p.get("eligibility"),
            p.get("notes"),
            False,
        ])
    tx.insert_or_update(table="Person", columns=p_cols, values=p_vals)

    # 3. Relationship table (bi-temporal)
    r_cols = ["from_id", "to_id", "rel_type", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"]
    r_vals = []
    for r in spec["relationships"]:
        v_from = parse_iso(r["valid_from"])
        v_to = parse_iso(r.get("valid_to")) or SENTINEL_MAX_TIMESTAMP
        rec_from = parse_iso(r["recorded_from"])
        rec_to = parse_iso(r.get("recorded_to")) or SENTINEL_MAX_TIMESTAMP
        r_vals.append([
            r["from_id"],
            r["to_id"],
            r["rel_type"],
            case_id,
            v_from,
            v_to,
            rec_from,
            rec_to,
        ])
    tx.insert_or_update(table="Relationship", columns=r_cols, values=r_vals)

    # 4. Asset table
    a_cols = ["asset_id", "case_id", "institution_id", "type", "label", "account_ref_masked", "est_value_inr", "ownership", "source_doc_id", "extraction_confidence", "status", "deleted"]
    a_vals = []
    held_cols = ["asset_id", "institution_id", "case_id"]
    held_vals = []
    owns_cols = ["person_id", "asset_id", "case_id", "valid_from", "valid_to", "recorded_from", "recorded_to"]
    owns_vals = []

    dec_id = c["deceased_person_id"]

    for a in spec["assets"]:
        aid = a["asset_id"]
        inst_id = a["institution_id"]
        val = Decimal(str(a["est_value_inr"]))
        a_vals.append([
            aid,
            case_id,
            inst_id,
            a["type"],
            a["label"],
            a["account_ref_masked"],
            val,
            a.get("ownership", "SOLE"),
            a.get("source_doc_id"),
            float(a.get("extraction_confidence", 0.95)),
            a.get("status", "LOCATED"),
            False,
        ])
        held_vals.append([aid, inst_id, case_id])
        owns_vals.append([
            dec_id,
            aid,
            case_id,
            now,
            SENTINEL_MAX_TIMESTAMP,
            now,
            SENTINEL_MAX_TIMESTAMP,
        ])

    tx.insert_or_update(table="Asset", columns=a_cols, values=a_vals)
    tx.insert_or_update(table="HeldAt", columns=held_cols, values=held_vals)
    tx.insert_or_update(table="Owns", columns=owns_cols, values=owns_vals)

    # 5. Nominee table (bi-temporal)
    nom_cols = ["person_id", "asset_id", "case_id", "share_pct", "valid_from", "valid_to", "recorded_from", "recorded_to"]
    nom_vals = []
    for nom in spec["nominees"]:
        v_from = parse_iso(nom["valid_from"])
        v_to = parse_iso(nom.get("valid_to")) or SENTINEL_MAX_TIMESTAMP
        rec_from = parse_iso(nom["recorded_from"])
        rec_to = parse_iso(nom.get("recorded_to")) or SENTINEL_MAX_TIMESTAMP
        nom_vals.append([
            nom["person_id"],
            nom["asset_id"],
            case_id,
            float(nom["share_pct"]),
            v_from,
            v_to,
            rec_from,
            rec_to,
        ])
    tx.insert_or_update(table="Nominee", columns=nom_cols, values=nom_vals)

    # 6. Will table
    w = spec["will"]
    w_cols = ["will_id", "case_id", "doc_id", "status", "executed_on", "bequests"]
    w_vals = [[
        w["will_id"],
        case_id,
        w.get("doc_id"),
        w["status"],
        datetime.strptime(w["executed_on"], "%Y-%m-%d").date() if w.get("executed_on") else None,
        json.dumps(w.get("bequests", [])),
    ]]
    tx.insert_or_update(table="Will", columns=w_cols, values=w_vals)

    # 7. Consent table
    con_cols = ["case_id", "person_id", "status", "signed_at"]
    con_vals = []
    for con in spec["consent"]:
        s_at = parse_iso(con["signed_at"]) if con.get("signed_at") else None
        con_vals.append([
            case_id,
            con["person_id"],
            con["status"],
            s_at,
        ])
    tx.insert_or_update(table="Consent", columns=con_cols, values=con_vals)

    # 8. Document table
    d_cols = ["doc_id", "case_id", "gcs_uri", "doc_type", "original_name", "extracted", "field_confidence", "status", "verified", "degraded", "uploaded_at", "deleted"]
    d_vals = []
    for doc in spec["documents"]:
        did = doc["doc_id"]
        fname = doc["original_name"]
        # Format filename: doc-sharma-01.pdf or original_name
        ext = fname.split(".")[-1]
        gcs_name = f"{did}.{ext}"
        gcs_uri = f"gs://{bucket_name}/seed/{seed_key}/{gcs_name}"
        d_vals.append([
            did,
            case_id,
            gcs_uri,
            doc["doc_type"],
            fname,
            json.dumps({"seeded": True}),
            json.dumps({"confidence": 0.98}),
            "EXTRACTED",
            doc.get("verified", False),
            False,
            now,
            False,
        ])
    tx.insert_or_update(table="Document", columns=d_cols, values=d_vals)

    print(f"Seeded case '{seed_key}' (ID: {case_id}) with {len(spec['people'])} people, {len(spec['assets'])} assets, {len(spec['documents'])} docs.")


def seed_database():
    """Main seed entry point executed in Spanner read-write transaction."""
    print("Beginning idempotent database seeding...")

    def _tx(tx: Transaction):
        seed_institutions(tx)
        seed_case_data(tx, SHARMA_SEED)
        seed_case_data(tx, MEHTA_SEED)

    run_in_transaction(_tx)
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()
