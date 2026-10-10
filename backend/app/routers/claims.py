
from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import (
    ClaimAdvanceResponse,
    ClaimApproveResponse,
    ClaimPacketResponse,
    ClaimResponse,
)

router = APIRouter(tags=["Claims"])


@router.get("/cases/{id}/claims", response_model=list[ClaimResponse])
async def list_claims(
    id: str,
    uid: str = CurrentUser,
):
    """List all generated asset settlement claims for a case."""
    raise NotImplementedException()


@router.get("/claims/{cid}/packet", response_model=ClaimPacketResponse)
async def get_claim_packet(
    cid: str,
    uid: str = CurrentUser,
):
    """Generate or retrieve complete claim packet and affidavits for a claim."""
    raise NotImplementedException()


@router.post("/claims/{cid}/approve", response_model=ClaimApproveResponse)
async def approve_claim(
    cid: str,
    uid: str = CurrentUser,
):
    """Approve a claim packet for submission."""
    raise NotImplementedException()


@router.post("/claims/{cid}/advance", response_model=ClaimAdvanceResponse)
async def advance_claim(
    cid: str,
    uid: str = CurrentUser,
):
    """Advance simulation status of a claim across the settlement lifecycle."""
    raise NotImplementedException()
