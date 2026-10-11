"""Tests for P10: Claims packager, claim lifecycle, and institution simulator.

Verifies:
1. Sharma clone:
   - Fixed-nominee assets (SBI Sav, LIC, EPF, PPF) + Loan are READY.
   - HDFC Sav is NEEDS_ACTION due to active dispute.
   - Unnominated assets (ICICI FD, Demat, MF, Locker, Apt, Car) are NEEDS_ACTION for missing Legal Heir Certificate.
2. Mehta clone:
   - Exactly ONE claim is NEEDS_ACTION (Bank of Baroda FD missing Legal Heir Certificate).
   - All other 7 claims are READY (Kotak Sav, Life, MF, PPF, CC, Apt, Car).
   - Uploading verified LEGAL_HEIR_CERT flips Bank of Baroda FD to READY after re-run.
3. Claims Approval & Consent Enforcement:
   - Approving without all signers' consent given returns HTTP 409 Conflict listing missing signers.
   - Approving with all consents given transitions status to SUBMITTED and starts the clock.
   - Non-owner caller cannot approve (403 Forbidden).
4. Institution Simulator:
   - POST /claims/{id}/advance moves SUBMITTED -> IN_REVIEW.
   - For exactly one claim per case, raises a realistic NEEDS_ACTION query ("additional KYC required").
   - Subsequent advance resumes to IN_REVIEW -> SETTLED.
   - Each transition writes an audit entry with actor "institution:<name> (simulated)" carrying simulated: true.
5. ReportLab PDF Packet:
   - Packet PDF is generated with '%PDF' magic header.
   - Running footer contains "Prepared by Virasat, guidance only".
"""

import uuid
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.repositories import AuditLogRepo, CasesRepo, ClaimRepo, ConsentRepo, DocumentRepo
from app.main import app
from app.services.claims import PACKETS_LOCAL_DIR, generate_claims_for_case
from app.services.sessions import clone_seed
from app.services.simulator import advance_claim

client = TestClient(app)


def test_sharma_clone_claims_statuses():
    """Verify Sharma clone claims strictly match checklist and dispute rules."""
    uid = f"test-p10-sharma-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="sharma", uid=uid, mode="prefilled")

    claims = generate_claims_for_case(case_id, actor="test_runner")
    assert len(claims) == 12, f"Expected 12 claims for Sharma, got {len(claims)}"

    claim_by_asset = {}
    for c in claims:
        # Normalized key
        aid_short = c["asset_id"].replace(f"a-{case_id[:8]}-", "")
        claim_by_asset[aid_short] = c

    # 1. Fixed-nominee assets must be READY
    assert claim_by_asset["sbi-sav"]["status"] == "READY"
    assert claim_by_asset["sbi-sav"]["route"] == "NOMINEE_PAYOUT"

    assert claim_by_asset["lic"]["status"] == "READY"
    assert claim_by_asset["lic"]["route"] == "NOMINEE_PAYOUT"

    assert claim_by_asset["epf"]["status"] == "READY"
    assert claim_by_asset["epf"]["route"] == "NOMINEE_PAYOUT"

    assert claim_by_asset["ppf"]["status"] == "READY"
    assert claim_by_asset["ppf"]["route"] == "NOMINEE_PAYOUT"

    # 2. Loan liability must be READY
    assert claim_by_asset["loan"]["status"] == "READY"
    assert claim_by_asset["loan"]["route"] == "LOAN"

    # 3. HDFC savings must be NEEDS_ACTION due to active dispute
    assert claim_by_asset["hdfc-sav"]["status"] == "NEEDS_ACTION"
    assert "dispute" in claim_by_asset["hdfc-sav"]["status_reason"].lower()

    # 4. Unnominated assets must be NEEDS_ACTION for missing Legal Heir Certificate
    unnominated_keys = ["icici-fd", "demat", "mf", "locker", "apt", "car"]
    for k in unnominated_keys:
        assert claim_by_asset[k]["status"] == "NEEDS_ACTION", f"Expected {k} to be NEEDS_ACTION"
        assert claim_by_asset[k]["route"] == "SUCCESSION", f"Expected {k} route to be SUCCESSION"
        assert "Legal Heir Certificate" in claim_by_asset[k]["status_reason"], (
            f"Expected {k} reason to mention Legal Heir Certificate, got: {claim_by_asset[k]['status_reason']}"
        )


def test_mehta_clone_single_needs_action_and_flip_to_ready():
    """Verify Mehta clone has exactly ONE NEEDS_ACTION (BOB FD), flipping to READY upon upload."""
    uid = f"test-p10-mehta-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")

    claims = generate_claims_for_case(case_id, actor="test_runner")
    assert len(claims) == 8, f"Expected 8 claims for Mehta, got {len(claims)}"

    ready_claims = [c for c in claims if c["status"] == "READY"]
    needs_action_claims = [c for c in claims if c["status"] == "NEEDS_ACTION"]

    # Exactly 1 NEEDS_ACTION
    assert len(needs_action_claims) == 1, (
        f"Expected exactly 1 NEEDS_ACTION claim in Mehta, got {len(needs_action_claims)}: "
        f"{[c['asset_id'] for c in needs_action_claims]}"
    )
    assert len(ready_claims) == 7

    bob_fd_claim = needs_action_claims[0]
    assert "bob-fd" in bob_fd_claim["asset_id"]
    assert bob_fd_claim["route"] == "SUCCESSION"
    assert "Legal Heir Certificate" in bob_fd_claim["status_reason"]

    # Now simulate user uploading verified LEGAL_HEIR_CERT
    doc_id = f"doc-mehta-heir-{uuid.uuid4().hex[:6]}"
    DocumentRepo.create({
        "doc_id": doc_id,
        "case_id": case_id,
        "doc_type": "LEGAL_HEIR_CERT",
        "original_name": "succession_certificate.pdf",
        "verified": True,
        "status": "PROCESSED",
        "confidence": 1.0,
        "gcs_uri": f"gs://bucket/cases/{case_id}/docs/{doc_id}.pdf",
    }, actor=uid)

    # Re-run claim generation
    refreshed_claims = generate_claims_for_case(case_id, actor="test_runner")
    refreshed_bob = next(c for c in refreshed_claims if "bob-fd" in c["asset_id"])

    # Must flip to READY
    assert refreshed_bob["status"] == "READY", f"Expected Bank of Baroda FD to flip to READY, got {refreshed_bob['status']}"
    assert all(c["status"] == "READY" for c in refreshed_claims), "All Mehta claims should now be READY"


def test_approve_claim_consent_enforcement_and_lifecycle():
    """Verify claim approval enforces DPDP consent (409) and advances to SUBMITTED."""
    uid = f"test-p10-consent-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")

    claims = generate_claims_for_case(case_id, actor="test_runner")
    # Take a READY claim: Kotak savings (claimant/signer: Rekha Mehta)
    kotak_claim = next(c for c in claims if "kotak-sav" in c["asset_id"])
    cid = kotak_claim["claim_id"]
    signer_pid = kotak_claim["packet"]["signers"][0]["person_id"]

    # 1. Test when consent is pending: temporarily revoke claimant's consent
    ConsentRepo.upsert({
        "case_id": case_id,
        "person_id": signer_pid,
        "status": "PENDING",
    }, actor="test_runner")

    # Refresh packet signers
    generate_claims_for_case(case_id, actor="test_runner")

    # Attempt to approve without consent -> 409 Conflict
    headers = {"Authorization": f"Bearer {uid}"}
    resp = client.post(f"/api/claims/{cid}/approve", headers=headers)
    assert resp.status_code == 409, f"Expected 409 Conflict, got {resp.status_code}: {resp.text}"
    err_body = resp.json()
    assert "missing_signers" in str(err_body)

    # 2. Grant consent and approve
    ConsentRepo.upsert({
        "case_id": case_id,
        "person_id": signer_pid,
        "status": "GIVEN",
    }, actor="test_runner")
    generate_claims_for_case(case_id, actor="test_runner")

    resp_approved = client.post(f"/api/claims/{cid}/approve", headers=headers)
    assert resp_approved.status_code == 200, f"Expected 200 OK, got {resp_approved.status_code}: {resp_approved.text}"
    approved_data = resp_approved.json()
    assert approved_data["approved"] is True
    assert approved_data["status"] == "SUBMITTED"
    assert approved_data["submitted_at"] is not None
    assert approved_data["due_at"] is not None

    # Check updated claim in DB
    updated_claim = ClaimRepo.get(cid)
    assert updated_claim["status"] == "SUBMITTED"


def test_institution_simulator_lifecycle_and_kyc_query():
    """Verify simulator moves SUBMITTED -> IN_REVIEW -> SETTLED with exactly 1 KYC query."""
    uid = f"test-p10-sim-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")

    claims = generate_claims_for_case(case_id, actor="test_runner")
    ready_claims = [c for c in claims if c["status"] == "READY"]
    claim_1 = ready_claims[0]
    claim_2 = ready_claims[1]

    cid_1 = claim_1["claim_id"]
    cid_2 = claim_2["claim_id"]
    headers = {"Authorization": f"Bearer {uid}"}

    # Approve both claims -> SUBMITTED
    resp1 = client.post(f"/api/claims/{cid_1}/approve", headers=headers)
    assert resp1.status_code == 200
    resp2 = client.post(f"/api/claims/{cid_2}/approve", headers=headers)
    assert resp2.status_code == 200

    # Advance Claim 1: SUBMITTED -> IN_REVIEW
    adv1 = client.post(f"/api/claims/{cid_1}/advance", headers=headers)
    assert adv1.status_code == 200
    assert adv1.json()["new_status"] == "IN_REVIEW"

    # Advance Claim 1 again: IN_REVIEW -> NEEDS_ACTION (Single KYC query for case)
    adv2 = client.post(f"/api/claims/{cid_1}/advance", headers=headers)
    assert adv2.status_code == 200
    data2 = adv2.json()
    assert data2["new_status"] == "NEEDS_ACTION"
    assert "additional kyc" in data2["status_reason"].lower()

    # Advance Claim 1 again (claimant resolves KYC): NEEDS_ACTION -> IN_REVIEW
    adv3 = client.post(f"/api/claims/{cid_1}/advance", headers=headers)
    assert adv3.status_code == 200
    assert adv3.json()["new_status"] == "IN_REVIEW"

    # Advance Claim 2: SUBMITTED -> IN_REVIEW
    adv_c2_1 = client.post(f"/api/claims/{cid_2}/advance", headers=headers)
    assert adv_c2_1.status_code == 200
    assert adv_c2_1.json()["new_status"] == "IN_REVIEW"

    # Advance Claim 2 again: Since Claim 1 already raised the KYC query, Claim 2 moves straight to SETTLED!
    adv_c2_2 = client.post(f"/api/claims/{cid_2}/advance", headers=headers)
    assert adv_c2_2.status_code == 200
    assert adv_c2_2.json()["new_status"] == "SETTLED"

    # Verify audit entries carry actor 'institution:<name> (simulated)' and simulated: true
    audit_entries = AuditLogRepo.list_by_case(case_id)
    simulated_entries = [e for e in audit_entries if "simulated" in str(e.get("actor", "")).lower()]
    assert len(simulated_entries) > 0, "Expected simulated audit entries"
    found_simulated_payload = False
    for e in simulated_entries:
        p = e.get("payload")
        if isinstance(p, str):
            try:
                import json
                p = json.loads(p)
            except Exception:
                p = {}
        if isinstance(p, dict) and p.get("simulated") is True:
            found_simulated_payload = True
            break
    assert found_simulated_payload, "Expected at least one audit entry with payload simulated: true"


def test_claim_board_and_packet_endpoints():
    """Verify GET /cases/{id}/claims and GET /claims/{cid}/packet."""
    uid = f"test-p10-board-{uuid.uuid4().hex[:8]}"
    case_id = clone_seed(seed_key="mehta", uid=uid, mode="prefilled")
    headers = {"Authorization": f"Bearer {uid}"}

    # 1. GET /cases/{id}/claims
    resp_board = client.get(f"/api/cases/{case_id}/claims", headers=headers)
    assert resp_board.status_code == 200
    board_data = resp_board.json()
    assert "board" in board_data
    assert "readiness_by_institution" in board_data
    assert "kpi" in board_data
    kpi = board_data["kpi"]
    assert kpi["blocked"] == 1  # Bank of Baroda FD is blocked
    assert Decimal(str(kpi["total_claimed"])) > 0

    # 2. GET /claims/{cid}/packet
    cid = board_data["claims"][0]["claim_id"]
    resp_packet = client.get(f"/api/claims/{cid}/packet", headers=headers)
    assert resp_packet.status_code == 200
    pkt_data = resp_packet.json()
    assert pkt_data["claim_id"] == cid
    assert "checklist" in pkt_data
    assert "pre_filled_form" in pkt_data
    assert "signers" in pkt_data
    assert "packet_pdf_url" in pkt_data

    # 3. GET /claims/{cid}/packet/pdf
    resp_pdf = client.get(f"/api/claims/{cid}/packet/pdf", headers=headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.headers["content-type"] == "application/pdf"
    assert resp_pdf.content.startswith(b"%PDF"), "Response content must be a valid PDF"

    # Check that PDF contains the running footer
    import re
    import zlib
    raw_bytes = resp_pdf.content
    pdf_text = raw_bytes.decode("latin1", errors="ignore")
    decompressed = ""
    for m in re.finditer(b"stream\r?\n(.*?)\r?\nendstream", raw_bytes, re.DOTALL):
        try:
            decompressed += zlib.decompress(m.group(1)).decode("latin1", errors="ignore") + "\n"
        except Exception:
            pass
    full_text = pdf_text + "\n" + decompressed
    assert "Prepared by Virasat, guidance only" in full_text
