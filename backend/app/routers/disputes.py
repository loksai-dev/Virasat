
from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import DisputeResolveRequest, DisputeResponse

router = APIRouter(tags=["Disputes"])


@router.get("/cases/{id}/disputes", response_model=list[DisputeResponse])
async def list_disputes(
    id: str,
    uid: str = CurrentUser,
):
    """List detected disputes or conflicting claims in a case."""
    raise NotImplementedException()


@router.post("/disputes/{did}/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    did: str,
    body: DisputeResolveRequest,
    uid: str = CurrentUser,
):
    """Record resolution of a flagged dispute."""
    raise NotImplementedException()
