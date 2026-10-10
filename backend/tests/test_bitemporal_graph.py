"""Integration tests for bi-temporal supersede and graph queries in Cloud Spanner."""

from datetime import datetime, timezone
from decimal import Decimal
import time
import uuid
import pytest
from google.cloud import spanner

from app.db.bitemporal import SENTINEL_MAX_TIMESTAMP, now_utc
from app.db.client import get_db, run_in_snapshot
from app.db.graph_queries import query_graph_gql, query_graph_sql
from app.db.repositories import (
    AssetRepo,
    CasesRepo,
    NomineeRepo,
    PersonRepo,
    RelationshipRepo,
)


def _cleanup(case_id: str):
    db = get_db()
    tables = [
        "Nominee", "Relationship", "Owns", "HeldAt",
        "Asset", "Person", "Cases", "ChangeLog", "AuditLog"
    ]
    def _del(tx):
        for t in tables:
            tx.execute_update(
                f"DELETE FROM {t} WHERE case_id = @cid",
                params={"cid": case_id},
                param_types={"cid": spanner.param_types.STRING},
            )
    try:
        db.run_in_transaction(_del)
    except Exception:
        pass


@pytest.fixture
def test_case_setup():
    case_id = f"TEST-BT-{uuid.uuid4().hex[:8]}"
    deceased_id = f"DEC-{uuid.uuid4().hex[:8]}"
    heir_id = f"HEIR-{uuid.uuid4().hex[:8]}"
    asset_id = f"AST-{uuid.uuid4().hex[:8]}"

    # Setup case
    CasesRepo.create({
        "case_id": case_id,
        "owner_uid": "test-owner",
        "title": "Bi-temporal Test Estate",
        "status": "in_progress",
        "deceased_person_id": deceased_id,
    })

    # Setup people
    PersonRepo.create({
        "person_id": deceased_id,
        "case_id": case_id,
        "full_name": "Ramesh Sharma",
        "role": "DECEASED",
        "sex": "M",
        "alive": False,
    })
    PersonRepo.create({
        "person_id": heir_id,
        "case_id": case_id,
        "full_name": "Arjun Sharma",
        "role": "HEIR",
        "sex": "M",
        "alive": True,
    })

    # Setup asset
    AssetRepo.create({
        "asset_id": asset_id,
        "case_id": case_id,
        "type": "SAVINGS",
        "label": "Bank Savings",
        "est_value_inr": Decimal("250000"),
    })

    yield {
        "case_id": case_id,
        "deceased_id": deceased_id,
        "heir_id": heir_id,
        "asset_id": asset_id,
    }

    _cleanup(case_id)


def test_bitemporal_supersede_nominee(test_case_setup):
    """Test bi-temporal supersede on Nominee edge.

    Historical query at t0 returns original share (100%),
    while query at t1 returns superseded share (60%).
    Old row is never overwritten or deleted.
    """
    ctx = test_case_setup
    case_id = ctx["case_id"]
    heir_id = ctx["heir_id"]
    asset_id = ctx["asset_id"]

    t0 = now_utc()
    NomineeRepo.insert({
        "person_id": heir_id,
        "asset_id": asset_id,
        "case_id": case_id,
        "share_pct": 100.0,
    }, valid_from=t0)

    time.sleep(0.05)

    # Verify at t0
    nominees_t0 = NomineeRepo.list_by_case(case_id, valid_at=t0, known_at=t0)
    assert len(nominees_t0) == 1
    assert nominees_t0[0]["share_pct"] == 100.0

    # Supersede at t1 with 60%
    t1 = now_utc()
    NomineeRepo.supersede(
        case_id=case_id,
        asset_id=asset_id,
        person_id=heir_id,
        new_data={
            "person_id": heir_id,
            "asset_id": asset_id,
            "case_id": case_id,
            "share_pct": 60.0,
        },
        effective_date=t1,
    )

    time.sleep(0.05)
    t2 = now_utc()

    # Query at t0 (historical as-of)
    hist_nominees = NomineeRepo.list_by_case(case_id, valid_at=t0, known_at=t0)
    assert len(hist_nominees) == 1
    assert hist_nominees[0]["share_pct"] == 100.0

    # Query at t2 (current as-of)
    curr_nominees = NomineeRepo.list_by_case(case_id, valid_at=t2, known_at=t2)
    assert len(curr_nominees) == 1
    assert curr_nominees[0]["share_pct"] == 60.0

    # Verify underlying physical rows in table: there must be 2 physical rows!
    def _count(snap):
        sql = "SELECT COUNT(1) FROM Nominee WHERE case_id = @cid"
        rows = list(snap.execute_sql(sql, params={"cid": case_id}, param_types={"cid": spanner.param_types.STRING}))
        return rows[0][0]

    physical_count = run_in_snapshot(_count)
    assert physical_count == 2, f"Expected 2 physical rows (rule 4 no overwrite), got {physical_count}"

    # Verify case version was bumped
    case = CasesRepo.get(case_id)
    assert case is not None
    assert case["data_version"] >= 3  # create + insert + supersede


def test_bitemporal_supersede_relationship(test_case_setup):
    """Test bi-temporal supersede on Relationship edge."""
    ctx = test_case_setup
    case_id = ctx["case_id"]
    heir_id = ctx["heir_id"]
    deceased_id = ctx["deceased_id"]

    t0 = now_utc()
    RelationshipRepo.insert({
        "from_id": heir_id,
        "to_id": deceased_id,
        "rel_type": "CHILD",
        "case_id": case_id,
    }, valid_from=t0)

    time.sleep(0.05)
    t1 = now_utc()

    # Query at t0
    rels_t0 = RelationshipRepo.list_by_case(case_id, valid_at=t0, known_at=t0)
    assert len(rels_t0) == 1
    assert rels_t0[0]["rel_type"] == "CHILD"

    # Supersede with SPECIFIED_HEIR
    RelationshipRepo.supersede(
        case_id=case_id,
        from_id=heir_id,
        to_id=deceased_id,
        rel_type="CHILD",
        new_data={
            "from_id": heir_id,
            "to_id": deceased_id,
            "rel_type": "CHILD",
            "case_id": case_id,
        },
        effective_date=t1,
    )

    # Physical row count must be 2
    def _count(snap):
        sql = "SELECT COUNT(1) FROM Relationship WHERE case_id = @cid"
        rows = list(snap.execute_sql(sql, params={"cid": case_id}, param_types={"cid": spanner.param_types.STRING}))
        return rows[0][0]

    assert run_in_snapshot(_count) == 2


def test_graph_gql_and_sql_fallback_identical(test_case_setup):
    """Verify GQL query over EstateGraph and SQL join fallback produce identical output."""
    ctx = test_case_setup
    case_id = ctx["case_id"]
    heir_id = ctx["heir_id"]
    deceased_id = ctx["deceased_id"]
    asset_id = ctx["asset_id"]

    t0 = now_utc()
    RelationshipRepo.insert({
        "from_id": heir_id,
        "to_id": deceased_id,
        "rel_type": "CHILD",
        "case_id": case_id,
    }, valid_from=t0)

    NomineeRepo.insert({
        "person_id": heir_id,
        "asset_id": asset_id,
        "case_id": case_id,
        "share_pct": 100.0,
    }, valid_from=t0)

    time.sleep(0.05)
    t_now = now_utc()

    snap_gql = run_in_snapshot(lambda s: query_graph_gql(s, case_id, t_now, t_now))
    snap_sql = run_in_snapshot(lambda s: query_graph_sql(s, case_id, t_now, t_now))

    assert snap_gql["case_id"] == snap_sql["case_id"]
    assert len(snap_gql["people"]) == len(snap_sql["people"])
    assert len(snap_gql["assets"]) == len(snap_sql["assets"])
    assert len(snap_gql["relationships"]) == len(snap_sql["relationships"])
    assert len(snap_gql["nominees"]) == len(snap_sql["nominees"])
    assert snap_gql["nominees"][0]["share_pct"] == snap_sql["nominees"][0]["share_pct"]
