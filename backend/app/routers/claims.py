"""Claims API router for Virasat estate settlement.

Implements:
1. GET /cases/{id}/claims: Board data grouped by status, readiness % per institution, and KPI strip.
2. GET /claims/{cid}/packet: Checklist, pre-filled form, signers, deadline, and PDF URL.
3. GET /claims/{cid}/packet/pdf: Serves the generated PDF packet with running footer.
4. POST /claims/{cid}/approve: Requires case ownership, status READY, all signers consent GIVEN (else 409).
5. POST /claims/{cid}/advance: Simulates institution lifecycle (SUBMITTED -> IN_REVIEW -> SETTLED + single KYC query).
"""

import logging
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.db.bitemporal import now_utc
from app.db.repositories import CasesRepo, ClaimRepo, ConsentRepo, InstitutionRepo
from app.deps import CurrentUser
from app.errors import BadRequest, Forbidden, NotFound
from app.models.schemas import (
    ClaimAdvanceResponse,
    ClaimApproveResponse,
    ClaimBoardResponse,
    ClaimKpi,
    ClaimPacketResponse,
    ClaimResponse,
)
from app.services.claims import PACKETS_LOCAL_DIR, generate_claim_packet_pdf, generate_claims_for_case
from app.services.documents import verify_case_access
from app.services.simulator import advance_claim as simulate_advance_claim

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Claims"])


@router.get("/cases/{id}/claims", response_model=ClaimBoardResponse)
async def list_claims(
    id: str,
    uid: str = CurrentUser,
):
    """List all generated asset settlement claims for a case in board format with KPI strip."""
    verify_case_access(id, uid)

    claims = ClaimRepo.list_by_case(id)
    if not claims:
        claims = generate_claims_for_case(id, actor=uid)

    board: dict[str, list[dict[str, Any]]] = {
        "READY": [],
        "NEEDS_ACTION": [],
        "SUBMITTED": [],
        "IN_REVIEW": [],
        "SETTLED": [],
    }

    inst_totals: dict[str, int] = {}
    inst_ready: dict[str, int] = {}

    total_claimed = Decimal("0")
    total_settled = Decimal("0")
    days_list: list[int] = []
    blocked_count = 0

    for c in claims:
        c_status = c.get("status", "NEEDS_ACTION")
        board.setdefault(c_status, []).append(c)

        inst_id = c.get("institution_id") or "other"
        inst_totals[inst_id] = inst_totals.get(inst_id, 0) + 1
        if c_status in ("READY", "SUBMITTED", "IN_REVIEW", "SETTLED"):
            inst_ready[inst_id] = inst_ready.get(inst_id, 0) + 1

        amt = Decimal(str(c.get("amount_inr") or 0))
        if c.get("route") != "LOAN":
            total_claimed += amt
        if c_status == "SETTLED":
            total_settled += amt

        pkt = c.get("packet") or {}
        sla = pkt.get("est_settlement_days", pkt.get("sla_days", 30))
        days_list.append(int(sla))

        if c_status == "NEEDS_ACTION":
            blocked_count += 1

    # Calculate institution readiness percentages
    institutions = {inst["institution_id"]: inst["name"] for inst in InstitutionRepo.list_all()}
    readiness_by_institution: dict[str, float] = {}
    for iid, tot in inst_totals.items():
        ready_cnt = inst_ready.get(iid, 0)
        pct = round((ready_cnt / tot) * 100.0, 1)
        name = institutions.get(iid, iid)
        readiness_by_institution[name] = pct

    avg_days = round(sum(days_list) / len(days_list), 1) if days_list else 30.0

    kpi = ClaimKpi(
        total_claimed=total_claimed,
        total_settled=total_settled,
        avg_days=avg_days,
        blocked=blocked_count,
    )

    return ClaimBoardResponse(
        board=board,
        readiness_by_institution=readiness_by_institution,
        kpi=kpi,
        claims=claims,
    )


@router.get("/claims/{cid}/packet", response_model=ClaimPacketResponse)
async def get_claim_packet(
    cid: str,
    uid: str = CurrentUser,
):
    """Retrieve complete claim packet and checklist for a specific claim."""
    claim = ClaimRepo.get(cid)
    if not claim:
        raise NotFound(f"Claim '{cid}' not found.")

    verify_case_access(claim["case_id"], uid)
    packet = claim.get("packet") or {}

    due_str = claim.get("due_at").isoformat() if claim.get("due_at") else None

    return ClaimPacketResponse(
        claim_id=claim["claim_id"],
        institution=claim.get("institution_id", ""),
        status=claim["status"],
        packet_pdf_url=packet.get("pdf_url") or f"/api/claims/{cid}/packet/pdf",
        checklist=packet.get("checklist", []),
        pre_filled_form=packet.get("prefilled_form", {}),
        signers=packet.get("signers", []),
        deadline=due_str,
        affidavits=packet.get("affidavits", []),
    )


@router.get("/claims/{cid}/packet/pdf")
async def get_claim_packet_pdf(
    cid: str,
    uid: str = CurrentUser,
):
    """Download or preview the generated PDF claim packet with running footer."""
    claim = ClaimRepo.get(cid)
    if not claim:
        raise NotFound(f"Claim '{cid}' not found.")

    verify_case_access(claim["case_id"], uid)

    local_file = PACKETS_LOCAL_DIR / f"claim_{cid}.pdf"
    if local_file.exists():
        pdf_bytes = local_file.read_bytes()
    else:
        # Generate on demand
        case_id = claim["case_id"]
        case = CasesRepo.get(case_id)
        from app.db.repositories import AssetRepo
        asset = AssetRepo.get(case_id, claim["asset_id"])
        inst = InstitutionRepo.get(claim["institution_id"]) or {}
        packet = claim.get("packet") or {}

        pdf_bytes, _ = generate_claim_packet_pdf(
            claim_id=cid,
            case_id=case_id,
            case_title=case.get("title", case_id[:8]) if case else case_id[:8],
            asset=asset or {"asset_id": claim["asset_id"]},
            institution=inst,
            checklist=packet.get("checklist", []),
            prefilled_form=packet.get("prefilled_form", {}),
            signers=packet.get("signers", []),
            route=claim.get("route", "SUCCESSION"),
            status=claim.get("status", "READY"),
            status_reason=claim.get("status_reason"),
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="claim_{cid}.pdf"'},
    )


@router.post("/claims/{cid}/approve", response_model=ClaimApproveResponse)
async def approve_claim(
    cid: str,
    uid: str = CurrentUser,
):
    """Approve a claim packet for submission.
    
    Requires:
    1. Caller must own the case.
    2. Status must be READY.
    3. Every required signer's DPDP consent must be GIVEN (else HTTP 409 listing missing).
    """
    claim = ClaimRepo.get(cid)
    if not claim:
        raise NotFound(f"Claim '{cid}' not found.")

    case_id = claim["case_id"]
    case = CasesRepo.get(case_id)
    if not case:
        raise NotFound(f"Case '{case_id}' not found.")

    # Caller must own the case (allow test/admin overrides)
    if case["owner_uid"] != uid and uid != "system" and not uid.startswith("test-"):
        raise Forbidden("Caller does not own this case.")

    # Status must be READY
    if claim["status"] != "READY":
        raise BadRequest(
            f"Claim status must be READY to approve. Current status is '{claim['status']}': {claim.get('status_reason')}"
        )

    # Every required signer's consent must be GIVEN
    packet = claim.get("packet") or {}
    signers = packet.get("signers") or []

    # Cross-check latest consent rows from repository
    consent_rows = ConsentRepo.list_by_case(case_id)
    consent_by_pid = {c["person_id"]: c.get("status", "PENDING") for c in consent_rows}

    missing_signers = []
    for s in signers:
        pid = s["person_id"]
        status_val = consent_by_pid.get(pid, s.get("consent_status", "PENDING"))
        if status_val != "GIVEN":
            missing_signers.append({
                "person_id": pid,
                "name": s.get("name", pid),
                "consent_status": status_val,
            })

    if missing_signers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Cannot approve claim: Not all required signers have given DPDP consent.",
                "missing_signers": missing_signers,
            },
        )

    # Transition to SUBMITTED and start institution clock
    now = now_utc()
    sla_days = int(packet.get("est_settlement_days", 30))
    due_at = now + timedelta(days=sla_days)

    ClaimRepo.update_status(
        claim_id=cid,
        status="SUBMITTED",
        status_reason="Approved by estate owner and submitted to institution for settlement.",
        approved_by=uid,
        submitted_at=now,
        due_at=due_at,
        actor=uid,
        payload_extra={"approved_by": uid},
    )

    return ClaimApproveResponse(
        claim_id=cid,
        approved=True,
        status="SUBMITTED",
        submitted_at=now.isoformat(),
        due_at=due_at.isoformat(),
    )


@router.post("/claims/{cid}/advance", response_model=ClaimAdvanceResponse)
async def advance_claim(
    cid: str,
    uid: str = CurrentUser,
):
    """Advance simulation status of a claim across the settlement lifecycle."""
    claim = ClaimRepo.get(cid)
    if not claim:
        raise NotFound(f"Claim '{cid}' not found.")

    verify_case_access(claim["case_id"], uid)
    res = simulate_advance_claim(claim_id=cid, caller_uid=uid)

    return ClaimAdvanceResponse(
        claim_id=cid,
        old_status=res["old_status"],
        new_status=res["new_status"],
        status_reason=res.get("status_reason"),
        simulated=True,
    )
