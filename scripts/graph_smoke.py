#!/usr/bin/env python3
"""Smoke test for Spanner Property Graph GQL and bi-temporal supersede.

Performs:
1. Insert test case with deceased, heir, asset, CHILD relationship and Nominee edge.
2. Query graph with GQL at t0 with two as-of filters and assert row returns.
3. Supersede Nominee edge at t1 (e.g. update share_pct) and assert old & new as-of queries differ.
4. Verify SQL fallback returns identical shape to GQL.
5. Clean up all test rows.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging
import os
from pathlib import Path
import sys
import time
import uuid

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("graph_smoke")

from app.db.bitemporal import now_utc
from app.db.client import get_db, run_in_snapshot, run_in_transaction
from app.db.graph_queries import query_graph_gql, query_graph_sql
from app.db.repositories import (
    AssetRepo,
    CasesRepo,
    NomineeRepo,
    PersonRepo,
    RelationshipRepo,
)
from google.cloud import spanner


def clean_up_case(case_id: str) -> None:
    """Delete all rows created for the test case."""
    logger.info("Cleaning up smoke test case %s...", case_id)
    db = get_db()
    tables = [
        "Nominee", "Relationship", "Owns", "HeldAt",
        "Asset", "Person", "Cases", "ChangeLog", "AuditLog"
    ]

    def _delete(tx):
        for t in tables:
            sql = f"DELETE FROM {t} WHERE case_id = @cid"
            tx.execute_update(sql, params={"cid": case_id}, param_types={"cid": spanner.param_types.STRING})

    try:
        db.run_in_transaction(_delete)
        logger.info("Cleanup completed for %s", case_id)
    except Exception as e:
        logger.warning("Cleanup failed: %s", e)


def run_smoke_test() -> None:
    test_id = f"SMOKE-{uuid.uuid4().hex[:8]}"
    deceased_id = f"DEC-{uuid.uuid4().hex[:8]}"
    heir_id = f"HEIR-{uuid.uuid4().hex[:8]}"
    asset_id = f"AST-{uuid.uuid4().hex[:8]}"

    logger.info("=== Starting Property Graph Smoke Test (case_id: %s) ===", test_id)

    try:
        # Step 1: Create Case
        t0 = now_utc()
        case_data = {
            "case_id": test_id,
            "owner_uid": "smoke-tester",
            "seed_key": "smoke",
            "title": "Smoke Test Estate",
            "status": "in_progress",
            "deceased_person_id": deceased_id,
        }
        CasesRepo.create(case_data, actor="smoke_test")
        logger.info("Created test case: %s", test_id)

        # Step 2: Create Deceased and Heir
        PersonRepo.create({
            "person_id": deceased_id,
            "case_id": test_id,
            "full_name": "Ramesh Sharma",
            "role": "DECEASED",
            "sex": "M",
            "alive": False,
        }, actor="smoke_test")

        PersonRepo.create({
            "person_id": heir_id,
            "case_id": test_id,
            "full_name": "Arjun Sharma",
            "role": "HEIR",
            "sex": "M",
            "alive": True,
        }, actor="smoke_test")
        logger.info("Created deceased and heir Person nodes")

        # Step 3: Create Asset
        AssetRepo.create({
            "asset_id": asset_id,
            "case_id": test_id,
            "type": "SAVINGS",
            "label": "HDFC Savings Account",
            "account_ref_masked": "XX-1234",
            "est_value_inr": Decimal("500000"),
            "status": "LOCATED",
        }, actor="smoke_test")
        logger.info("Created Asset node: %s", asset_id)

        # Step 4: Create CHILD Relationship (Arjun IS THE CHILD OF Ramesh)
        RelationshipRepo.insert({
            "from_id": heir_id,
            "to_id": deceased_id,
            "rel_type": "CHILD",
            "case_id": test_id,
        }, actor="smoke_test")

        logger.info("Inserted Relationship edge: %s CHILD of %s", heir_id, deceased_id)

        # Step 5: Create Nominee edge (Arjun is 100% nominee for Asset)
        NomineeRepo.insert({
            "person_id": heir_id,
            "asset_id": asset_id,
            "case_id": test_id,
            "share_pct": 100.0,
        }, actor="smoke_test")
        logger.info("Inserted Nominee edge: Arjun -> 100.0%% share for %s", asset_id)

        # Capture t0 immediately after initial graph state is established
        time.sleep(0.05)
        t0 = now_utc()

        # Step 6: Execute GQL query at t0
        logger.info("Executing GQL snapshot at t0...")
        snap_t0 = run_in_snapshot(lambda snap: query_graph_gql(snap, test_id, valid_at=t0, known_at=t0))


        assert len(snap_t0["people"]) == 2, f"Expected 2 people, got {len(snap_t0['people'])}"
        assert len(snap_t0["assets"]) == 1, f"Expected 1 asset, got {len(snap_t0['assets'])}"
        assert len(snap_t0["relationships"]) == 1, f"Expected 1 relationship, got {len(snap_t0['relationships'])}"
        assert snap_t0["relationships"][0]["rel_type"] == "CHILD"
        assert len(snap_t0["nominees"]) == 1, f"Expected 1 nominee, got {len(snap_t0['nominees'])}"
        assert snap_t0["nominees"][0]["share_pct"] == 100.0, "Expected nominee share 100.0%"
        logger.info("GQL snapshot at t0 PASSED. Returned: %s nominee share", snap_t0["nominees"][0]["share_pct"])

        # Step 7: Supersede the Nominee edge at t1
        t1 = now_utc()
        logger.info("Superseding Nominee edge at t1: updating share_pct to 50.0%%...")
        NomineeRepo.supersede(
            case_id=test_id,
            asset_id=asset_id,
            person_id=heir_id,
            new_data={
                "asset_id": asset_id,
                "person_id": heir_id,
                "case_id": test_id,
                "share_pct": 50.0,
            },
            actor="smoke_test",
            effective_date=t1,
        )

        time.sleep(0.05)
        t2 = now_utc()

        # Step 8: Assert that old (t0) and new (t2) as-of queries differ
        logger.info("Executing GQL snapshot at t0 (historical query)...")
        snap_historical = run_in_snapshot(lambda snap: query_graph_gql(snap, test_id, valid_at=t0, known_at=t0))
        assert len(snap_historical["nominees"]) == 1
        assert snap_historical["nominees"][0]["share_pct"] == 100.0, (
            f"Historical query should return 100.0%, got {snap_historical['nominees'][0]['share_pct']}"
        )

        logger.info("Executing GQL snapshot at t2 (current query)...")
        snap_current = run_in_snapshot(lambda snap: query_graph_gql(snap, test_id, valid_at=t2, known_at=t2))
        assert len(snap_current["nominees"]) == 1
        assert snap_current["nominees"][0]["share_pct"] == 50.0, (
            f"Current query should return 50.0%, got {snap_current['nominees'][0]['share_pct']}"
        )

        logger.info(
            "Bi-temporal assertion PASSED: historical query returned 100.0%%, current query returned 50.0%%!"
        )

        # Step 9: Verify SQL fallback returns identical shape to GQL
        logger.info("Testing SQL fallback against GQL...")
        snap_sql = run_in_snapshot(lambda snap: query_graph_sql(snap, test_id, valid_at=t2, known_at=t2))

        assert snap_sql["case_id"] == snap_current["case_id"]
        assert len(snap_sql["people"]) == len(snap_current["people"])
        assert len(snap_sql["assets"]) == len(snap_current["assets"])
        assert len(snap_sql["relationships"]) == len(snap_current["relationships"])
        assert len(snap_sql["nominees"]) == len(snap_current["nominees"])
        assert snap_sql["nominees"][0]["share_pct"] == snap_current["nominees"][0]["share_pct"]
        logger.info("SQL Fallback assertion PASSED: identical results to GQL!")

        print("\n========================================================")
        print("ALL GRAPH SMOKE TESTS PASSED SUCCESSFULLY (GQL + SQL)!")
        print("========================================================\n")

    finally:
        clean_up_case(test_id)


if __name__ == "__main__":
    run_smoke_test()
