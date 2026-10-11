"""Institution simulator service for Virasat.

Simulates the institutional lifecycle of asset claims:
1. Moves claims SUBMITTED -> IN_REVIEW -> SETTLED.
2. For exactly one claim per case, raises a realistic NEEDS_ACTION query
   ("Additional KYC required: Institutional verification requires an updated utility bill or passport copy for claimant address verification.")
   so the user experiences realistic institution interaction.
3. Subsequent advance moves from NEEDS_ACTION -> IN_REVIEW -> SETTLED.
4. Each transition writes an audit entry with actor "institution:<name> (simulated)"
   and payload containing simulated: true.
5. Preserves lifecycle states across re-runs.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import get_settings
from app.db.bitemporal import now_utc
from app.db.repositories import ClaimRepo, InstitutionRepo
from app.errors import NotFound

logger = logging.getLogger(__name__)


def advance_claim(claim_id: str, caller_uid: str | None = None) -> dict[str, Any]:
    """Advance simulation status of a claim across the settlement lifecycle."""
    claim = ClaimRepo.get(claim_id)
    if not claim:
        raise NotFound(f"Claim '{claim_id}' not found.")

    case_id = claim["case_id"]
    old_status = claim["status"]

    # Resolve institution actor
    inst_id = claim.get("institution_id")
    inst = InstitutionRepo.get(inst_id) if inst_id else None
    inst_name = inst.get("name", "Institution") if inst else "Financial Institution"
    actor = f"institution:{inst_name} (simulated)"

    packet = dict(claim.get("packet") or {})

    # Check if a KYC query was already raised for any claim in this case
    all_claims = ClaimRepo.list_by_case(case_id)
    has_kyc_query = any(
        ("additional kyc" in str(c.get("status_reason", "")).lower())
        or bool(c.get("packet", {}).get("simulated_kyc_raised"))
        for c in all_claims
    )

    now = now_utc()
    submitted_at = claim.get("submitted_at")
    due_at = claim.get("due_at")

    if old_status == "SUBMITTED":
        new_status = "IN_REVIEW"
        status_reason = "Claim documentation under formal review by institution operations."
    elif old_status == "IN_REVIEW":
        if not has_kyc_query:
            # Raise realistic KYC query for exactly one claim per case
            new_status = "NEEDS_ACTION"
            status_reason = (
                "Additional KYC required: Institutional verification requires an updated utility bill "
                "or passport copy for claimant address verification."
            )
            packet["simulated_kyc_raised"] = True
        else:
            new_status = "SETTLED"
            status_reason = "Claim successfully settled. Payout/title transfer completed."
    elif old_status == "NEEDS_ACTION":
        # Claimant resolved KYC or back-and-forth advance
        new_status = "IN_REVIEW"
        status_reason = "Claimant submitted required KYC documentation; institutional verification resumed."
    elif old_status == "READY":
        new_status = "SUBMITTED"
        status_reason = "Claim packet submitted to institution."
        if not submitted_at:
            submitted_at = now
            sla_days = int(packet.get("est_settlement_days", 30))
            due_at = now + timedelta(days=sla_days)
    elif old_status == "SETTLED":
        return {
            "claim_id": claim_id,
            "old_status": "SETTLED",
            "new_status": "SETTLED",
            "status_reason": claim.get("status_reason") or "Claim is already settled.",
            "simulated": True,
        }
    else:
        new_status = old_status
        status_reason = claim.get("status_reason")

    # Update claim status in database with simulated audit entry
    ClaimRepo.update_status(
        claim_id=claim_id,
        status=new_status,
        status_reason=status_reason,
        approved_by=claim.get("approved_by"),
        submitted_at=submitted_at,
        due_at=due_at,
        actor=actor,
        payload_extra={
            "simulated": True,
            "old_status": old_status,
            "new_status": new_status,
            "caller_uid": caller_uid,
        },
        packet=packet,
    )

    return {
        "claim_id": claim_id,
        "old_status": old_status,
        "new_status": new_status,
        "status_reason": status_reason,
        "simulated": True,
    }


async def auto_advance_claims(case_id: str, interval_seconds: int = 5) -> None:
    """Optional background daemon to auto-advance claims in DEMO_MODE."""
    settings = get_settings()
    if not settings.DEMO_MODE:
        return

    claims = ClaimRepo.list_by_case(case_id)
    sub_or_rev = [c for c in claims if c.get("status") in ("SUBMITTED", "IN_REVIEW")]
    for c in sub_or_rev:
        await asyncio.sleep(interval_seconds)
        advance_claim(c["claim_id"], caller_uid="simulator_daemon")
