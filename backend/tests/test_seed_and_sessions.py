"""Tests for P5: Seed cases, document generation, and session cloning.

Verifies:
1. Both seed cases exist and have exact asset counts and net estate totals.
2. Cloning 'sharma' produces 12 assets netting 28,400,000 INR.
3. Cloning 'mehta' produces 8 assets netting 16,780,000 INR.
4. Bi-temporal as-of queries on HDFC savings nominees return Sunita 100% for
   (valid 2023-06-01, known 2023-12-01) vs Sunita 50% & Vikram 50% for now.
5. Two different UIDs receive completely isolated clones.
6. The planted inconsistencies in Vikram Sharma's affidavit are present and verifiable.
"""

import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from google.cloud import spanner
from google.cloud.spanner_v1.snapshot import Snapshot

from app.db.bitemporal import as_of_clause
from app.db.client import run_in_snapshot
from app.db.graph_queries import snapshot as get_snapshot
from app.db.repositories import CasesRepo
from app.services.sessions import clone_seed


def test_seed_cases_populated_in_db():
    """Verify seed templates exist and are owned by SEED."""
    sharma_case = CasesRepo.get("seed-sharma")
    assert sharma_case is not None
    assert sharma_case["owner_uid"] == "SEED"
    assert sharma_case["seed_key"] == "sharma"
    assert sharma_case["title"] == "VR-2026-0142"

    mehta_case = CasesRepo.get("seed-mehta")
    assert mehta_case is not None
    assert mehta_case["owner_uid"] == "SEED"
    assert mehta_case["seed_key"] == "mehta"
    assert mehta_case["title"] == "VR-2026-0187"


def test_sharma_clone_assets_and_net_estate():
    """Verify a clone of Sharma has 12 assets netting 28,400,000 INR."""
    test_uid = "test-uid-sharma-verifier"
    case_id = clone_seed(seed_key="sharma", uid=test_uid, mode="prefilled")
    assert case_id is not None
    assert case_id != "seed-sharma"

    snap = get_snapshot(case_id=case_id)
    assets = snap.get("assets", [])
    assert len(assets) == 12

    total_net = sum(Decimal(str(a["est_value_inr"])) for a in assets)
    assert total_net == Decimal("28400000")


def test_mehta_clone_assets_and_net_estate():
    """Verify a clone of Mehta has 8 assets netting 16,780,000 INR."""
    test_uid = "test-uid-mehta-verifier"
    case_id = clone_seed(seed_key="mehta", uid=test_uid, mode="prefilled")
    assert case_id is not None
    assert case_id != "seed-mehta"

    snap = get_snapshot(case_id=case_id)
    assets = snap.get("assets", [])
    assert len(assets) == 8

    total_net = sum(Decimal(str(a["est_value_inr"])) for a in assets)
    assert total_net == Decimal("16780000")


def test_hdfc_nominee_bitemporal_as_of_queries():
    """Verify HDFC nominee as-of queries:

    - valid 2023-06-01, known 2023-12-01 -> Sunita 100%
    - valid 2026-03-14 (dod), known now -> Sunita 50%, Vikram 50%
    """
    case_id = "seed-sharma"
    hdfc_asset_id = "a-sharma-hdfc-sav"

    # Query 1: As of 2023-06-01 valid, 2023-12-01 known
    t1_valid = datetime(2023, 6, 1, 0, 0, 0, tzinfo=UTC)
    t1_known = datetime(2023, 12, 1, 0, 0, 0, tzinfo=UTC)
    asof_sql_1, params_1, ptypes_1 = as_of_clause(t1_valid, t1_known, prefix="n")

    def _query1(snap: Snapshot):
        sql = f"""
        SELECT n.person_id, n.share_pct
        FROM Nominee n
        WHERE n.case_id = @cid AND n.asset_id = @aid AND {asof_sql_1}
        """
        p = {"cid": case_id, "aid": hdfc_asset_id, **params_1}
        pt = {"cid": spanner.param_types.STRING, "aid": spanner.param_types.STRING, **ptypes_1}
        rows = list(snap.execute_sql(sql, params=p, param_types=pt))
        return {r[0]: float(r[1]) for r in rows}

    res_1 = run_in_snapshot(_query1)
    # On 2023-12-01, the new April 2024 records were not known yet! Only Sunita 100% existed
    assert len(res_1) == 1
    assert res_1["p-sharma-sunita"] == 100.0

    # Query 2: As of date of death (2026-03-14), known today
    t2_valid = datetime(2026, 3, 14, 0, 0, 0, tzinfo=UTC)
    t2_known = datetime.now(UTC)
    asof_sql_2, params_2, ptypes_2 = as_of_clause(t2_valid, t2_known, prefix="n")

    def _query2(snap: Snapshot):
        sql = f"""
        SELECT n.person_id, n.share_pct
        FROM Nominee n
        WHERE n.case_id = @cid AND n.asset_id = @aid AND {asof_sql_2}
        """
        p = {"cid": case_id, "aid": hdfc_asset_id, **params_2}
        pt = {"cid": spanner.param_types.STRING, "aid": spanner.param_types.STRING, **ptypes_2}
        rows = list(snap.execute_sql(sql, params=p, param_types=pt))
        return {r[0]: float(r[1]) for r in rows}

    res_2 = run_in_snapshot(_query2)
    # Today, the superseded row is inactive and the 50/50 split is active
    assert len(res_2) == 2
    assert res_2["p-sharma-sunita"] == 50.0
    assert res_2["p-sharma-vikram"] == 50.0


def test_isolated_clones_for_two_different_uids():
    """Verify two different uids get distinct, completely isolated clones."""
    uid_1 = "user-alpha-99"
    uid_2 = "user-beta-88"

    case_1 = clone_seed("sharma", uid_1, mode="prefilled")
    case_2 = clone_seed("sharma", uid_2, mode="prefilled")

    assert case_1 != case_2

    c1 = CasesRepo.get(case_1)
    c2 = CasesRepo.get(case_2)

    assert c1["owner_uid"] == uid_1
    assert c2["owner_uid"] == uid_2

    snap_1 = get_snapshot(case_1)
    snap_2 = get_snapshot(case_2)

    p1_ids = {p["person_id"] for p in snap_1["people"]}
    p2_ids = {p["person_id"] for p in snap_2["people"]}
    assert p1_ids.isdisjoint(p2_ids), "Persons in clone 1 must not collide with clone 2"

    a1_ids = {a["asset_id"] for a in snap_1["assets"]}
    a2_ids = {a["asset_id"] for a in snap_2["assets"]}
    assert a1_ids.isdisjoint(a2_ids), "Assets in clone 1 must not collide with clone 2"


def test_vikram_affidavit_planted_inconsistencies():
    """Verify the planted inconsistencies in Vikram Sharma's affidavit.

    Must contain:
    - Name typo: 'Rameshh Sharma'
    - Fraudulent dod: '2026-03-19' (actual is 2026-03-14)
    - Notary prior to death: '2026-03-10'
    """
    cache_path = Path(__file__).resolve().parent.parent / "app" / "seed" / "cache" / "sharma" / "doc-sharma-18.json"
    assert cache_path.exists(), f"Affidavit cache file not found at {cache_path}"

    with open(cache_path, encoding="utf-8") as f:
        data = json.load(f)

    inconsistencies = data.get("inconsistencies", {})
    assert inconsistencies.get("name_typo") == "Rameshh Sharma"
    assert inconsistencies.get("fraudulent_dod") == "2026-03-19"
    assert inconsistencies.get("notary_prior_to_death") == "2026-03-10"

    # Also verify the generated PDF file exists and contains these strings
    pdf_path = Path(__file__).resolve().parent.parent / "app" / "seed" / "docs" / "sharma" / "doc-sharma-18.pdf"
    assert pdf_path.exists(), f"Affidavit PDF not found at {pdf_path}"
    with open(pdf_path, "rb") as f:
        raw_pdf = f.read()

    # ReportLab encodes page stream with ASCII85 & FlateDecode
    import base64
    import zlib
    s_start = raw_pdf.find(b"stream\n") + 7
    s_end = raw_pdf.find(b"endstream")
    stream = raw_pdf[s_start:s_end].strip()
    pdf_text = zlib.decompress(base64.a85decode(stream, adobe=True)).decode("latin1")

    assert "Rameshh Sharma" in pdf_text
    assert "19th March 2026" in pdf_text
    assert "10th day of March 2026" in pdf_text
