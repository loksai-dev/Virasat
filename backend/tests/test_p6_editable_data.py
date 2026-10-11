"""Tests for P6: Editable data (CRUD, bi-temporal history, audit chain)."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.client import run_in_transaction
from app.db.repositories import AssetRepo, NomineeRepo, PersonRepo
from app.main import app
from app.services.sessions import clone_seed


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_add_an_heir(async_client: AsyncClient):
    """Test adding an heir to a cloned case."""
    uid = "test-user-p6-add-heir"
    case_id = clone_seed("sharma", uid, mode="prefilled")

    headers = {"Authorization": f"Bearer {uid}"}

    # 1. Add an heir
    payload = {
        "full_name": "Rohan Sharma Junior",
        "role": "HEIR",
        "sex": "M",
        "dob": "1995-04-12",
        "personal_law": "hindu",
    }
    res = await async_client.post(f"/api/cases/{case_id}/people", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    body = res.json()
    assert "entity" in body
    assert body["case_version"] >= 2
    assert body["stale"] is True
    new_pid = body["entity"]["person_id"]

    # 2. Verify person appears in list_people
    list_res = await async_client.get(f"/api/cases/{case_id}/people", headers=headers)
    assert list_res.status_code == 200
    people = list_res.json()
    assert any(p["person_id"] == new_pid and p["full_name"] == "Rohan Sharma Junior" for p in people)

    # 3. Verify history recorded change
    hist_res = await async_client.get(f"/api/cases/{case_id}/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert any(h.get("entity") == "Person" and h.get("entity_id") == new_pid for h in history)

    # 4. Verify audit trail has entry
    audit_res = await async_client.get(f"/api/cases/{case_id}/audit", headers=headers)
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()
    assert any(a.get("action") == "person_created" and a.get("payload", {}).get("person_id") == new_pid for a in audit_entries)


@pytest.mark.asyncio
async def test_change_nominee_and_bitemporal_as_of_queries(async_client: AsyncClient):
    """Test replacing nominees atomically and verifying as-of time-travel differences."""
    uid = "test-user-p6-nominees"
    case_id = clone_seed("sharma", uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    people = PersonRepo.list_by_case(case_id)
    sunita = next(p for p in people if "Sunita" in p["full_name"])
    arjun = next(p for p in people if "Arjun" in p["full_name"])

    assets = AssetRepo.list_by_case(case_id)
    sbi_savings = next(a for a in assets if a["type"] == "SAVINGS" and "SBI" in a["label"])
    aid = sbi_savings["asset_id"]

    # Initially at t0, Sunita is 100%
    t0 = datetime.now(UTC) - timedelta(seconds=1)

    # Replace nominees at t1: Sunita 60%, Arjun 40%
    payload = {
        "nominees": [
            {"person_id": sunita["person_id"], "share_pct": 60.0},
            {"person_id": arjun["person_id"], "share_pct": 40.0},
        ]
    }
    res = await async_client.put(f"/api/assets/{aid}/nominees", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["case_version"] >= 2

    # Query bi-temporal repository at t0 (past) vs now
    as_of_t0 = NomineeRepo.list_by_case(case_id, valid_at=t0, known_at=t0)
    as_of_t0_asset = [n for n in as_of_t0 if n["asset_id"] == aid]
    assert len(as_of_t0_asset) == 1
    assert as_of_t0_asset[0]["person_id"] == sunita["person_id"]
    assert as_of_t0_asset[0]["share_pct"] == 100.0

    as_of_now = NomineeRepo.list_by_case(case_id, valid_at=datetime.now(UTC), known_at=datetime.now(UTC))
    as_of_now_asset = [n for n in as_of_now if n["asset_id"] == aid]
    assert len(as_of_now_asset) == 2
    shares_map = {n["person_id"]: n["share_pct"] for n in as_of_now_asset}
    assert shares_map[sunita["person_id"]] == 60.0
    assert shares_map[arjun["person_id"]] == 40.0


@pytest.mark.asyncio
async def test_nominee_total_not_100_rejected(async_client: AsyncClient):
    """Test that nominee shares total must be exactly 100% or empty."""
    uid = "test-user-p6-nominee-val"
    case_id = clone_seed("sharma", uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    people = PersonRepo.list_by_case(case_id)
    sunita = next(p for p in people if "Sunita" in p["full_name"])
    arjun = next(p for p in people if "Arjun" in p["full_name"])
    assets = AssetRepo.list_by_case(case_id)
    aid = assets[0]["asset_id"]

    # 1. Total = 90% (rejected with 422)
    bad_payload_90 = {
        "nominees": [
            {"person_id": sunita["person_id"], "share_pct": 50.0},
            {"person_id": arjun["person_id"], "share_pct": 40.0},
        ]
    }
    res_90 = await async_client.put(f"/api/assets/{aid}/nominees", json=bad_payload_90, headers=headers)
    assert res_90.status_code == 422, res_90.text

    # 2. Total = 110% (rejected with 422)
    bad_payload_110 = {
        "nominees": [
            {"person_id": sunita["person_id"], "share_pct": 60.0},
            {"person_id": arjun["person_id"], "share_pct": 50.0},
        ]
    }
    res_110 = await async_client.put(f"/api/assets/{aid}/nominees", json=bad_payload_110, headers=headers)
    assert res_110.status_code == 422, res_110.text

    # 3. Empty list -> Allowed (no nominees)
    empty_payload = {"nominees": []}
    res_empty = await async_client.put(f"/api/assets/{aid}/nominees", json=empty_payload, headers=headers)
    assert res_empty.status_code == 200, res_empty.text


@pytest.mark.asyncio
async def test_stale_if_match_returns_409(async_client: AsyncClient):
    """Test optimistic concurrency control: mismatching If-Match returns 409."""
    uid = "test-user-p6-concurrency"
    case_id = clone_seed("sharma", uid, mode="prefilled")

    case_res = await async_client.get(f"/api/cases/{case_id}", headers={"Authorization": f"Bearer {uid}"})
    assert case_res.status_code == 200
    current_version = case_res.json()["data_version"]

    people = PersonRepo.list_by_case(case_id)
    heir = next(p for p in people if p["role"] != "DECEASED")
    pid = heir["person_id"]

    # Mismatched If-Match: 999
    stale_headers = {
        "Authorization": f"Bearer {uid}",
        "If-Match": str(current_version + 999),
    }
    bad_res = await async_client.patch(
        f"/api/people/{pid}",
        json={"notes": "Updated note with stale version"},
        headers=stale_headers,
    )
    assert bad_res.status_code == 409, bad_res.text
    assert "version conflict" in bad_res.json()["error"]["message"].lower()

    # Valid If-Match
    valid_headers = {
        "Authorization": f"Bearer {uid}",
        "If-Match": str(current_version),
    }
    ok_res = await async_client.patch(
        f"/api/people/{pid}",
        json={"notes": "Updated note with valid version"},
        headers=valid_headers,
    )
    assert ok_res.status_code == 200, ok_res.text


@pytest.mark.asyncio
async def test_soft_delete_asset_removes_from_lists_keeps_history(async_client: AsyncClient):
    """Test soft-deleting an asset removes it from active list but preserves ChangeLog history."""
    uid = "test-user-p6-soft-delete"
    case_id = clone_seed("sharma", uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    assets = AssetRepo.list_by_case(case_id)
    assert len(assets) == 12
    target_asset = assets[0]
    aid = target_asset["asset_id"]

    # Delete asset
    del_res = await async_client.delete(f"/api/assets/{aid}", headers=headers)
    assert del_res.status_code == 200, del_res.text
    del_body = del_res.json()
    assert del_body["entity"]["deleted"] is True

    # Check asset list: should now have 11 assets
    list_res = await async_client.get(f"/api/cases/{case_id}/assets", headers=headers)
    assert list_res.status_code == 200
    remaining_assets = list_res.json()
    assert len(remaining_assets) == 11
    assert not any(a["asset_id"] == aid for a in remaining_assets)

    # Direct GET /assets/{aid} should return 404
    get_res = await async_client.get(f"/api/assets/{aid}", headers=headers)
    assert get_res.status_code == 404

    # GET /history should retain the deleted change log record
    hist_res = await async_client.get(f"/api/cases/{case_id}/history?entity=Asset&entity_id={aid}", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert any(h["entity"] == "Asset" and h["entity_id"] == aid and h["field"] == "deleted" and h["new_value"] == "true" for h in history)


@pytest.mark.asyncio
async def test_cross_user_access_returns_403_or_404(async_client: AsyncClient):
    """Test isolation between users and read-only protection of SEED templates."""
    alice_uid = "test-user-alice-p6"
    bob_uid = "test-user-bob-p6"

    alice_case_id = clone_seed("sharma", alice_uid, mode="prefilled")
    alice_assets = AssetRepo.list_by_case(alice_case_id)
    alice_aid = alice_assets[0]["asset_id"]

    # Bob tries to access Alice's case endpoint -> 403 Forbidden
    bob_headers = {"Authorization": f"Bearer {bob_uid}"}
    res_case = await async_client.get(f"/api/cases/{alice_case_id}/people", headers=bob_headers)
    assert res_case.status_code == 403

    # Bob tries to access Alice's entity id directly -> 404 Not Found (avoids probing)
    res_entity = await async_client.get(f"/api/assets/{alice_aid}", headers=bob_headers)
    assert res_entity.status_code == 404

    # Any user tries mutation on seed template -> 403 Forbidden
    res_seed_mutate = await async_client.post(
        "/api/cases/seed-sharma/people",
        json={"name": "Hacker Heir", "role": "HEIR"},
        headers=bob_headers,
    )
    assert res_seed_mutate.status_code == 403
    assert "read-only" in res_seed_mutate.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_audit_verify_valid_and_tampered(async_client: AsyncClient):
    """Test audit chain verification and tamper detection."""
    from google.cloud import spanner
    uid = "test-user-p6-audit-verify"
    case_id = clone_seed("sharma", uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # Perform a couple of mutations
    await async_client.post(
        f"/api/cases/{case_id}/people",
        json={"name": "Audit Test Heir", "role": "HEIR", "sex": "F"},
        headers=headers,
    )

    # 1. Verify chain is valid
    verify_res = await async_client.get(f"/api/cases/{case_id}/audit/verify", headers=headers)
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["valid"] is True
    assert v_data["first_bad_seq"] is None
    assert v_data["verified_entries"] >= 2

    # 2. Deliberately tamper with one row in Spanner in a transaction
    def _tamper_tx(tx):
        # Update entry seq 2 with tampered payload
        sql = "UPDATE AuditLog SET payload = PARSE_JSON('{\"tampered\": true}') WHERE case_id = @cid AND seq = 2"
        tx.execute_update(sql, params={"cid": case_id}, param_types={"cid": spanner.param_types.STRING})

    run_in_transaction(_tamper_tx)

    # 3. Verify chain now detects tampering at seq 2
    tampered_res = await async_client.get(f"/api/cases/{case_id}/audit/verify", headers=headers)
    assert tampered_res.status_code == 200
    t_data = tampered_res.json()
    assert t_data["valid"] is False
    assert t_data["first_bad_seq"] == 2


@pytest.mark.asyncio
async def test_validation_rules(async_client: AsyncClient):
    """Test validation constraints: deceased count, self-relation, dod/dob, loans, will bequests."""
    uid = "test-user-p6-validations"
    case_id = clone_seed("sharma", uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # 1. Second deceased person rejected
    res_dec = await async_client.post(
        f"/api/cases/{case_id}/people",
        json={"name": "Second Deceased", "role": "DECEASED"},
        headers=headers,
    )
    assert res_dec.status_code == 422
    assert "one deceased person" in res_dec.json()["error"]["message"].lower()

    # 2. Self-relative rejected
    people = PersonRepo.list_by_case(case_id)
    pid = people[0]["person_id"]
    res_self = await async_client.post(
        f"/api/cases/{case_id}/relationships",
        json={"from_id": pid, "to_id": pid, "rel_type": "SIBLING"},
        headers=headers,
    )
    assert res_self.status_code == 422
    assert "own relative" in res_self.json()["error"]["message"].lower()

    # 3. dod < dob rejected
    res_dates = await async_client.post(
        f"/api/cases/{case_id}/people",
        json={"name": "Time Traveler", "role": "HEIR", "dob": "2020-01-01", "dod": "2010-01-01"},
        headers=headers,
    )
    assert res_dates.status_code == 422
    assert "date of birth" in res_dates.json()["error"]["message"].lower()

    # 4. Loan asset must be <= 0
    res_loan = await async_client.post(
        f"/api/cases/{case_id}/assets",
        json={"type": "LOAN", "estimated_value_inr": 50000, "label": "Bad Loan"},
        headers=headers,
    )
    assert res_loan.status_code == 422
    assert "<= 0" in res_loan.json()["error"]["message"]

    # 5. Non-loan asset must be >= 0
    res_non_loan = await async_client.post(
        f"/api/cases/{case_id}/assets",
        json={"type": "SAVINGS", "estimated_value_inr": -100, "label": "Negative Savings"},
        headers=headers,
    )
    assert res_non_loan.status_code == 422
    assert ">= 0" in res_non_loan.json()["error"]["message"]

    # 6. Will residuary total must be in (0, 100]
    heir1 = people[1]["person_id"]
    heir2 = people[2]["person_id"]
    res_will = await async_client.put(
        f"/api/cases/{case_id}/will",
        json={
            "status": "REGISTERED",
            "bequests": [
                {"person_id": heir1, "asset_id": None, "share_pct": 80.0},
                {"person_id": heir2, "asset_id": None, "share_pct": 50.0},  # total = 130%
            ],
        },
        headers=headers,
    )
    assert res_will.status_code == 422
    assert "(0, 100]" in res_will.json()["error"]["message"]
