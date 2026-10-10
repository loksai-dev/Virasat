from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import WillResponse, WillUpdateRequest

router = APIRouter(tags=["Will"])


@router.get("/cases/{id}/will", response_model=WillResponse)
async def get_will(
    id: str,
    uid: str = CurrentUser,
):
    """Get will metadata and parsed clauses for a case."""
    raise NotImplementedException()


@router.put("/cases/{id}/will", response_model=WillResponse)
async def update_will(
    id: str,
    body: WillUpdateRequest,
    uid: str = CurrentUser,
):
    """Submit or update will details for a case."""
    raise NotImplementedException()
