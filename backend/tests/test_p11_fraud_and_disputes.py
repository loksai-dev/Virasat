"""Comprehensive tests for P11: Fraud and Dispute Agent, Detectors, and Routes.

Verifies:
1. Sharma clone detects:
   (a) Vikram's claim conflicting with the statutory rules engine result (CONFLICTING_CLAIM),
   (b) The HDFC nominee mismatch from bi-temporal records and the old statement (NOMINEE_MISMATCH),
   (c) The affidavit's wrong date of death, wrong name spelling (rapidfuzz), and early notary date (DOCUMENT_INCONSISTENCY).
2. Mehta clone returns zero disputes (clean estate, risk_score == 0.0, label == "Low").
3. Deleting Vikram's affidavit and re-running removes the document-based findings.
4. Resolving a dispute and re-running keeps it resolved (idempotency by evidence_hash) and unblocks related claims.
5. GET /api/cases/{id}/disputes returns disputes list, risk score, contributing factors, and events timeline.
6. POST /api/disputes/{id}/resolve with REQUEST_DOCS creates DocRequest in claim checklist.
"""

from __future__ import annotations

import json
import uuid
import pytest
from httpx import AsyncClient

from app.agents.fraud_dispute import FraudDisputeAgent
from app.db.repositories import (
    AssetRepo,
    CasesRepo,
    ClaimRepo,
    DisputeRepo,
    DocRequestRepo,
    DocumentRepo,
)
from app.services.claims import generate_claims_for_case
from app.services.events import EventEmitter
from app.services.sessions import clone_seed


class DummyEmitter(EventEmitter):
    """Event emitter collecting events in memory without Spanner persistence for testing."""

    def __init__(self, run_id: str, case_id: str):
        super().__init__(run_id, case_id)
        self.events: list[dict] = []

    def emit(self, event_type: str, message: str = "", agent: str = "", **kwargs):
        self.events.append({
            "event_type": event_type,
            "message": message,
            "agent": agent,
            **kwargs,
        })
        return {"seq": len(self.events)}


@pytest.mark.asyncio
async def test_sharma_clone_disputes_and_findings():
    """Verify Sharma clone detects Vikram's conflicting claim, HDFC nominee mismatch, and affidavit inconsistencies."""
    uid = f"test-p11-sharma-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")

    agent = FraudDisputeAgent()
    emitter = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)

    res = await agent.execute(case_id=case_id, prompt="Analyze estate vulnerabilities", emitter=emitter)

    assert res["status"] == "success"
    disputes = res["disputes"]
    assert len(disputes) >= 3, f"Expected at least 3 disputes in Sharma, got {len(disputes)}"

    disputes_by_kind = {d["kind"]: d for d in disputes}

    # 1. Conflicting Claim: Vikram Sharma (Class II sibling) claiming priority over Class I heirs
    assert "CONFLICTING_CLAIM" in disputes_by_kind
    conf_disp = disputes_by_kind["CONFLICTING_CLAIM"]
    assert "Vikram" in conf_disp["title"] or "Vikram" in str(conf_disp["evidence"])
    assert conf_disp["severity"] in ("HIGH", "CRITICAL")
    assert "Class I" in conf_disp["title"] or "Class I" in str(conf_disp.get("evidence", {}))

    # 2. Nominee Mismatch: HDFC savings statement (100% Sunita) vs core banking bi-temporal at DOD (50% Sunita, 50% Vikram)
    assert "NOMINEE_MISMATCH" in disputes_by_kind
    nom_disp = disputes_by_kind["NOMINEE_MISMATCH"]
    assert "HDFC" in nom_disp["title"] or "hdfc" in str(nom_disp["evidence"])
    assert nom_disp["severity"] in ("MEDIUM", "HIGH")
    nom_details = nom_disp.get("evidence", {}).get("details", {})
    assert "Sunita" in str(nom_details)

    # 3. Document Inconsistency: Wrong DOD, Rapidfuzz name typo, early notary date
    assert "DOCUMENT_INCONSISTENCY" in disputes_by_kind
    doc_disp = disputes_by_kind["DOCUMENT_INCONSISTENCY"]
    doc_details = doc_disp.get("evidence", {}).get("details", {})
    anomalies = str(doc_details.get("anomalies", []))
    # Must derive all three from actual extracted documents
    assert "Date of Death contradiction" in anomalies or "2026-03-19" in str(doc_details)
    assert "Name spelling variance" in anomalies or "Rameshh" in str(doc_details)
    assert "Anachronistic Notarization" in anomalies or "2026-03-10" in str(doc_details)

    # Risk Score & Label
    assert res["risk_score"] >= 50.0
    assert res["risk_label"] in ("Medium", "High")
    assert len(res["contributing_factors"]) >= 3


@pytest.mark.asyncio
async def test_mehta_clone_clean_estate_no_disputes():
    """Verify Mehta clone returns zero disputes (clean estate, registered will)."""
    uid = f"test-p11-mehta-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")

    agent = FraudDisputeAgent()
    emitter = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)

    res = await agent.execute(case_id=case_id, prompt="Analyze estate vulnerabilities", emitter=emitter)

    assert res["status"] == "success"
    assert res["disputes_count"] == 0
    assert len(res["disputes"]) == 0
    assert res["risk_score"] == 0.0
    assert res["risk_label"] == "Low"
    assert len(res["contributing_factors"]) == 0


@pytest.mark.asyncio
async def test_delete_affidavit_removes_document_findings():
    """Deleting Vikram's affidavit and re-running removes document-based findings."""
    uid = f"test-p11-del-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")

    agent = FraudDisputeAgent()
    emitter = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)

    # Initial run: all findings present
    res_initial = await agent.execute(case_id=case_id, prompt="Scan", emitter=emitter)
    kinds_initial = {d["kind"] for d in res_initial["disputes"]}
    assert "DOCUMENT_INCONSISTENCY" in kinds_initial
    assert "DOCUMENT_TAMPER_RISK" in kinds_initial

    # Locate and delete Vikram's affidavit
    docs = DocumentRepo.list_by_case(case_id)
    affidavit_doc = next(
        d for d in docs
        if "affidavit" in str(d.get("original_name", "")).lower() or d.get("doc_type") == "AFFIDAVIT"
    )
    DocumentRepo.delete(affidavit_doc["doc_id"], actor=uid)

    # Re-run fraud detection
    emitter_rerun = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)
    res_rerun = await agent.execute(case_id=case_id, prompt="Scan post deletion", emitter=emitter_rerun)

    kinds_rerun = {d["kind"] for d in res_rerun["disputes"]}

    # Document-based findings derived from the affidavit must be removed
    assert "DOCUMENT_INCONSISTENCY" not in kinds_rerun, "Document inconsistency should be removed after deleting affidavit"
    assert "DOCUMENT_TAMPER_RISK" not in kinds_rerun, "Document tamper risk should be removed after deleting affidavit"

    # Non-affidavit findings like HDFC nominee mismatch should persist
    assert "NOMINEE_MISMATCH" in kinds_rerun, "HDFC nominee mismatch is statement-based and should remain"


@pytest.mark.asyncio
async def test_resolve_dispute_persists_across_reruns_and_unblocks_claim(async_client: AsyncClient):
    """Resolving a dispute keeps it resolved across re-runs and unblocks related claims."""
    uid = f"test-p11-resolve-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # 1. Initial claims generation: HDFC savings is blocked (NEEDS_ACTION) due to dispute
    claims = generate_claims_for_case(case_id, actor="test_runner")
    hdfc_claim = next(c for c in claims if "hdfc-sav" in c["asset_id"])
    assert hdfc_claim["status"] == "NEEDS_ACTION"

    # 2. Run fraud dispute agent
    agent = FraudDisputeAgent()
    emitter = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)
    res = await agent.execute(case_id=case_id, prompt="Scan", emitter=emitter)
    disputes = res["disputes"]

    # 3. Resolve the disputes via POST /api/disputes/{did}/resolve
    for d in disputes:
        resp = await async_client.post(
            f"/api/disputes/{d['dispute_id']}/resolve",
            json={"action": "RESOLVE", "note": "Amicable settlement reached among heirs"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "RESOLVED"

    # 4. Re-run fraud dispute agent: disputes must remain RESOLVED
    emitter_rerun = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)
    res_rerun = await agent.execute(case_id=case_id, prompt="Scan again", emitter=emitter_rerun)

    assert all(d["status"] == "RESOLVED" for d in res_rerun["disputes"]), "All disputes should stay RESOLVED after re-run"
    assert res_rerun["risk_score"] == 0.0, "Resolved disputes should reduce active risk score to 0"

    # 5. Claims re-evaluation: HDFC savings claim should now be unblocked (READY)
    refreshed_claims = generate_claims_for_case(case_id, actor="test_runner")
    refreshed_hdfc = next(c for c in refreshed_claims if "hdfc-sav" in c["asset_id"])
    assert refreshed_hdfc["status"] == "READY", f"Expected HDFC claim to be unblocked and READY, got {refreshed_hdfc['status']}"


@pytest.mark.asyncio
async def test_disputes_api_routes_and_doc_request(async_client: AsyncClient):
    """Verify GET /api/cases/{id}/disputes and POST /api/disputes/{id}/resolve with REQUEST_DOCS."""
    uid = f"test-p11-api-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # Generate disputes
    agent = FraudDisputeAgent()
    emitter = DummyEmitter(run_id=f"run-{uuid.uuid4().hex[:8]}", case_id=case_id)
    await agent.execute(case_id=case_id, prompt="Scan", emitter=emitter)

    # 1. Test GET /api/cases/{id}/disputes
    get_resp = await async_client.get(f"/api/cases/{case_id}/disputes", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["case_id"] == case_id
    assert len(data["disputes"]) >= 3
    assert data["risk_score"] >= 50.0
    assert data["risk_label"] in ("Medium", "High")
    assert isinstance(data["timeline"], list)
    assert isinstance(data["contributing_factors"], list)

    target_disp = data["disputes"][0]
    target_id = target_disp["dispute_id"]

    # 2. Test POST /api/disputes/{did}/resolve with REQUEST_DOCS
    resolve_resp = await async_client.post(
        f"/api/disputes/{target_id}/resolve",
        json={"action": "REQUEST_DOCS", "note": "Original registered partition deed required from sub-registrar"},
        headers=headers,
    )
    assert resolve_resp.status_code == 200
    res_data = resolve_resp.json()
    assert res_data["status"] == "DOCS_REQUESTED"

    # 3. Verify DocRequest was created and appears in claims checklist
    doc_reqs = DocRequestRepo.list_by_case(case_id)
    assert len(doc_reqs) >= 1
    assert any("partition deed" in r["doc_name"] for r in doc_reqs)

    claims = generate_claims_for_case(case_id, actor="test_runner")
    # At least one claim packet checklist must feature the REQUESTED item
    has_requested_in_checklist = False
    for c in claims:
        pkt = c.get("packet") or {}
        chk = pkt.get("checklist", [])
        if any(item.get("status") == "REQUESTED" for item in chk):
            has_requested_in_checklist = True
            break
    assert has_requested_in_checklist, "Claim packet checklist must display the requested document with status REQUESTED"
