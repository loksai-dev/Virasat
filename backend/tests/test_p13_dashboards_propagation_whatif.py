"""Comprehensive test suite for P13: Dashboards, change propagation and what-if.

DONE WHEN:
1. On a Sharma clone, marking Arjun as predeceased automatically triggers a run,
   shares recompute, claims refresh, overview.stale goes true then false, and the audit log shows who changed what.
2. A what-if that adds a registered will returns a diff without changing stored data.
3. Editing a nominee on the Mehta clone updates only the affected claim.
4. The institution dashboard returns data even with zero user cases.
5. /impact returns no unsourced numbers.
"""

from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient

from app.db.repositories import (
    AssetRepo,
    AuditLogRepo,
    CasesRepo,
    ClaimRepo,
    DisputeRepo,
    NomineeRepo,
    PersonRepo,
    ShareResultRepo,
    WillRepo,
)
from app.services.change_propagation import change_propagator, plan_rerun
from app.services.claims import generate_claims_for_case
from app.services.impact import load_market_figures
from app.services.sessions import clone_seed


@pytest.mark.asyncio
async def test_case_overview_endpoint(async_client: AsyncClient):
    """Verify GET /cases/{id}/overview returns all rich computed aggregate metrics."""
    uid = f"test-p13-overview-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    generate_claims_for_case(case_id)
    headers = {"Authorization": f"Bearer {uid}"}

    resp = await async_client.get(f"/api/cases/{case_id}/overview", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Core identification
    assert data["case_id"] == case_id
    assert "Sharma" in data["deceased_name"]
    assert data["status"] in ("in_progress", "active")

    # Financial aggregates
    assert float(data["estate_value_inr"]) > 0
    assert data["assets_found"] >= 7
    assert data["claims_total"] >= 7
    assert data["claims_filed"] >= 0

    # Settlement turnaround
    assert data["est_settlement_days"] > 0
    assert data["baseline_days"] == 180

    # Risk & By-type donut
    assert data["risk_label"] in ("Low", "Medium", "High")
    assert len(data["by_type"]) > 0
    for item in data["by_type"]:
        assert "type" in item
        if item["type"] != "LOAN":
            assert float(item["value_inr"]) >= 0
        else:
            assert float(item["value_inr"]) <= 0

    # Next actions with target route
    assert len(data["next_actions"]) > 0
    for action in data["next_actions"]:
        assert action["title"]
        assert action["cta"]
        assert action["target_route"].startswith("/")

    # Alerts, timeline, and consent
    assert isinstance(data["alerts"], list)
    assert len(data["alerts"]) > 0  # Sharma has active disputes/blocked claims
    assert isinstance(data["timeline"], list)
    assert len(data["timeline"]) > 0
    assert "given" in data["consent"]
    assert "total" in data["consent"]

    # Fresh state
    assert data["stale"] is False

    # Also test non-/api endpoint
    resp_root = await async_client.get(f"/cases/{case_id}/overview", headers=headers)
    assert resp_root.status_code == 200


@pytest.mark.asyncio
async def test_case_graph_bi_temporal_endpoint(async_client: AsyncClient):
    """Verify GET /cases/{id}/graph returns nodes/edges with eligibility, dispute flags, and layer filtering."""
    uid = f"test-p13-graph-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}
    # Initialize shares and dispute
    await async_client.get(f"/api/cases/{case_id}/shares", headers=headers)
    DisputeRepo.save_disputes(
        case_id=case_id,
        new_disputes=[{
            "kind": "CONFLICTING_CLAIM",
            "severity": "HIGH",
            "title": "Vikram Sharma contesting HDFC account nomination",
            "evidence": {"details": "Vikram contesting HDFC account nomination"},
            "recommended_action": "Resolve nominee dispute",
        }],
        computed_for_version=1,
    )

    # 1. Full graph
    resp = await async_client.get(f"/api/cases/{case_id}/graph", headers=headers)
    assert resp.status_code == 200, resp.text
    full_graph = resp.json()

    assert len(full_graph["nodes"]) > 0
    assert len(full_graph["edges"]) > 0

    people_nodes = [n for n in full_graph["nodes"] if n["kind"] == "person"]
    asset_nodes = [n for n in full_graph["nodes"] if n["kind"] == "asset"]
    assert len(people_nodes) >= 3
    assert len(asset_nodes) >= 5

    # Check eligibility decoration from ShareResult
    assert any(n.get("eligibility") == "ELIGIBLE" for n in people_nodes)

    # Check disputed flags (Vikram or HDFC flagged from dispute)
    assert any(n.get("disputed") is True for n in full_graph["nodes"])

    # 2. Layer filtering: assets only
    resp_assets = await async_client.get(f"/api/cases/{case_id}/graph?layers=assets", headers=headers)
    assert resp_assets.status_code == 200
    assets_graph = resp_assets.json()
    assert all(n["kind"] == "asset" for n in assets_graph["nodes"])
    assert len(assets_graph["nodes"]) >= 5


@pytest.mark.asyncio
async def test_institution_dashboard_claims_savings_synthetic(async_client: AsyncClient):
    """Verify institution endpoints return complete dashboards even with 0 user cases via synthetic backfill."""
    uid = f"test-p13-inst-{uuid.uuid4().hex[:8]}"
    headers = {"Authorization": f"Bearer {uid}"}

    # 1. Dashboard
    resp = await async_client.get("/api/institution/dashboard", headers=headers)
    assert resp.status_code == 200, resp.text
    dash = resp.json()

    assert dash["total_claims"] > 0
    assert dash["open_claims"] > 0
    assert dash["pending_verification"] >= 0
    assert dash["fraud_flags"] >= 0
    assert dash["avg_processing_days"] > 0
    assert dash["stp_percentage"] > 0
    assert float(dash["cost_saved_inr"]) > 0
    assert dash["synthetic"] is True

    # Configurable cost assumptions labelled
    assert "cost_savings_per_claim_inr" in dash["cost_assumptions"]
    assert "IBA" in dash["cost_assumptions"]["assumptions_label"]

    # Rich charts: funnel, before vs after, claims by type, regional split
    assert len(dash["funnel"]) >= 4
    assert "cycle_time_days" in dash["before_vs_after"]
    assert len(dash["claims_by_type"]) >= 4
    assert len(dash["regional_split"]) >= 3

    # 2. Institution claims
    resp_claims = await async_client.get("/api/institution/claims", headers=headers)
    assert resp_claims.status_code == 200
    claims = resp_claims.json()
    assert len(claims) > 0
    for c in claims:
        assert c["claim_id"]
        assert c["route"]
        assert c["status"]

    # 3. Institution savings calculation
    resp_savings = await async_client.get("/api/institution/savings?claims_per_year=1000", headers=headers)
    assert resp_savings.status_code == 200
    savings = resp_savings.json()
    assert savings["claims_per_year"] == 1000
    assert savings["estimated_hours_saved"] == 12500.0
    assert float(savings["estimated_rupees_saved"]) == 4050000.0
    assert savings["synthetic"] is True


@pytest.mark.asyncio
async def test_impact_no_unsourced_numbers(async_client: AsyncClient):
    """Verify GET /impact returns hero metrics and strictly sourced numbers with official URLs."""
    uid = f"test-p13-impact-{uuid.uuid4().hex[:8]}"
    headers = {"Authorization": f"Bearer {uid}"}

    resp = await async_client.get("/api/impact", headers=headers)
    assert resp.status_code == 200, resp.text
    impact = resp.json()

    # Hero numbers
    assert impact["hero"]["cases_resolved"] >= 2
    assert float(impact["hero"]["total_wealth_unlocked_inr"]) > 0
    assert impact["hero"]["litigation_prevented_est"] >= 4
    assert impact["hero"]["avg_time_reduction_pct"] > 80.0

    # Before vs After timeline
    assert len(impact["before_vs_after_timeline"]) == 4
    for stage in impact["before_vs_after_timeline"]:
        assert stage["stage"]
        assert stage["traditional_days"] > stage["virasat_days"]
        assert stage["virasat_solution"]

    # Market block: STRICT RULE: only figures present in market.yaml with a source_url retain values
    market = impact["market"]
    assert len(market) >= 5
    for item in market:
        if item["value"] is not None:
            assert item["source_url"] is not None, f"Item '{item['key']}' has value without source_url"
            assert item["source_url"].startswith("http"), f"Item '{item['key']}' source_url must start with http"
            assert item["note"] is None
        else:
            assert item["note"] == "source needed"

    # Direct test on load_market_figures logic
    verified_figs = load_market_figures()
    for vf in verified_figs:
        if vf["value"] is not None:
            assert vf["source_url"] and vf["source_url"].startswith("http")
        else:
            assert vf["note"] == "source needed"


def test_plan_rerun_minimal_stages():
    """Verify plan_rerun decides the exact minimal stages per mutated entity."""
    # 1. Person change -> shares, explanations, claims, fraud
    p_stages = plan_rerun([{"entity": "Person", "field": "alive"}])
    assert p_stages == ["claims", "explanations", "fraud", "shares"]

    # 2. Relationship change -> shares, explanations, claims, fraud
    r_stages = plan_rerun([{"entity": "Relationship", "field": "rel_type"}])
    assert r_stages == ["claims", "explanations", "fraud", "shares"]

    # 3. Will change -> shares, explanations, claims, fraud
    w_stages = plan_rerun([{"entity": "Will", "field": "status"}])
    assert w_stages == ["claims", "explanations", "fraud", "shares"]

    # 4. Nominee change -> routes, affected_claims, nominee_checks
    n_stages = plan_rerun([{"entity": "Nominee", "field": "share_pct"}])
    assert n_stages == ["affected_claims", "nominee_checks", "routes"]

    # 5. Asset change -> asset_claim, aggregates
    a_stages = plan_rerun([{"entity": "Asset", "field": "est_value_inr"}])
    assert a_stages == ["aggregates", "asset_claim"]

    # 6. Document change -> extraction, discovery, fraud, affected_claims
    d_stages = plan_rerun([{"entity": "Document", "field": "status"}])
    assert d_stages == ["affected_claims", "discovery", "extraction", "fraud"]

    # 7. Consent change -> consent_approvability (no model calls)
    c_stages = plan_rerun([{"entity": "Consent", "field": "status"}])
    assert c_stages == ["consent_approvability"]


@pytest.mark.asyncio
async def test_whatif_registered_will_diff_without_storage(async_client: AsyncClient):
    """Verify POST /cases/{id}/whatif returns shares diff and claim readiness without persisting to database."""
    uid = f"test-p13-whatif-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # Record baseline state in Cloud Spanner
    initial_case = CasesRepo.get(case_id)
    initial_version = initial_case["data_version"]
    initial_will = WillRepo.get_by_case(case_id)
    initial_will_status = initial_will.get("status") if initial_will else "NONE"

    # Simulate what-if adding a registered will granting 50% to Sunita and 50% to Priya
    people = PersonRepo.list_by_case(case_id)
    sunita = next(p for p in people if "Sunita" in p["full_name"])
    priya = next(p for p in people if "Priya" in p["full_name"])

    whatif_payload = {
        "changes": [
            {
                "entity": "will",
                "action": "update",
                "payload": {
                    "status": "REGISTERED",
                    "is_registered": True,
                    "bequests": [
                        {"person_id": sunita["person_id"], "asset_key": "-", "share_pct": 50.0},
                        {"person_id": priya["person_id"], "asset_key": "-", "share_pct": 50.0},
                    ],
                },
            }
        ]
    }

    resp = await async_client.post(f"/api/cases/{case_id}/whatif", json=whatif_payload, headers=headers)
    assert resp.status_code == 200, resp.text
    res = resp.json()

    assert res["case_id"] == case_id
    assert res["simulated"] is True
    assert len(res["baseline_shares"]) >= 2
    assert len(res["shares"]) >= 2
    assert len(res["diff"]) >= 2
    assert "claim_readiness" in res
    assert "delta_explanation" in res

    # Verify diff items
    sunita_diff = next(d for d in res["diff"] if d["person_id"] == sunita["person_id"])
    priya_diff = next(d for d in res["diff"] if d["person_id"] == priya["person_id"])
    assert float(sunita_diff["whatif_pct"]) == 54.4
    assert float(priya_diff["whatif_pct"]) == 45.6

    # CRITICAL CHECK: Cloud Spanner database was NEVER mutated
    after_case = CasesRepo.get(case_id)
    assert after_case["data_version"] == initial_version, "What-if simulation modified case data_version!"

    after_will = WillRepo.get_by_case(case_id)
    after_will_status = after_will.get("status") if after_will else "NONE"
    assert after_will_status == initial_will_status, "What-if simulation modified stored Will status!"


@pytest.mark.asyncio
async def test_mehta_nominee_edit_updates_only_affected_claim(async_client: AsyncClient):
    """Verify editing a nominee on Mehta clone updates only the affected claim."""
    uid = f"test-p13-mehta-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")
    generate_claims_for_case(case_id)
    headers = {"Authorization": f"Bearer {uid}"}

    # Fetch initial claims
    initial_claims = ClaimRepo.list_by_case(case_id)
    assert len(initial_claims) >= 3

    # Pick SBI FD asset
    assets = AssetRepo.list_by_case(case_id)
    sbi_asset = next(a for a in assets if "sbi" in a["asset_id"].lower() or "fd" in str(a.get("type", "")).lower())
    target_aid = sbi_asset["asset_id"]

    other_claims_before = {c["claim_id"]: c for c in initial_claims if c["asset_id"] != target_aid}

    # Edit nominee for this asset
    people = PersonRepo.list_by_case(case_id)
    heir = next(p for p in people if p.get("role") != "DECEASED")

    put_nominee_payload = {
        "nominees": [
            {"person_id": heir["person_id"], "share_pct": 100.0}
        ]
    }
    resp = await async_client.put(f"/api/assets/{target_aid}/nominees", json=put_nominee_payload, headers=headers)
    assert resp.status_code == 200, resp.text

    # Trigger targeted run via propagator
    await change_propagator.trigger_now(case_id)

    # Fetch updated claims
    updated_claims = ClaimRepo.list_by_case(case_id)
    target_claim = next(c for c in updated_claims if c["asset_id"] == target_aid)
    assert target_claim is not None

    # Verify other claims were untouched
    for cid, before_c in other_claims_before.items():
        matching = next((c for c in updated_claims if c["claim_id"] == cid), None)
        assert matching is not None
        assert matching["status"] == before_c["status"]
        assert matching["route"] == before_c["route"]


@pytest.mark.asyncio
async def test_sharma_arjun_predeceased_propagation_and_stale_toggle(async_client: AsyncClient):
    """Verify marking Arjun as predeceased triggers run, recomputes shares, toggles stale, and records audit."""
    uid = f"test-p13-sharma-prop-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # 1. Baseline overview: stale is False
    overview_resp = await async_client.get(f"/api/cases/{case_id}/overview", headers=headers)
    assert overview_resp.status_code == 200
    assert overview_resp.json()["stale"] is False

    # 2. Identify Arjun
    people = PersonRepo.list_by_case(case_id)
    arjun = next(p for p in people if "Arjun" in p["full_name"])

    # 3. Patch Arjun: mark predeceased
    patch_payload = {
        "alive": False,
        "dod": "2026-01-01",
    }
    patch_resp = await async_client.patch(f"/api/people/{arjun['person_id']}", json=patch_payload, headers=headers)
    assert patch_resp.status_code == 200

    # 4. Overview stale toggles to True (mutation occurred, run pending/active)
    stale_resp = await async_client.get(f"/api/cases/{case_id}/overview", headers=headers)
    assert stale_resp.status_code == 200
    assert stale_resp.json()["stale"] is True

    # 5. Trigger immediate pipeline run
    await change_propagator.trigger_now(case_id)

    # 6. Overview stale returns to False
    fresh_resp = await async_client.get(f"/api/cases/{case_id}/overview", headers=headers)
    assert fresh_resp.status_code == 200
    fresh_data = fresh_resp.json()
    assert fresh_data["stale"] is False

    # 7. Shares recomputed: Arjun is excluded, Sunita and Priya inherit
    shares = ShareResultRepo.list_by_case_and_scenario(case_id, "current")
    arjun_shares = [s for s in shares if s["person_id"] == arjun["person_id"]]
    for s in arjun_shares:
        assert float(s["share_pct"]) == 0.0, "Predeceased heir should receive 0% share"

    # 8. Audit log records mutation and actor
    audit_entries = AuditLogRepo.list_by_case(case_id)
    person_updates = [e for e in audit_entries if e["action"] == "person_updated"]
    assert len(person_updates) > 0
    assert any(e["actor"] == uid for e in person_updates)
