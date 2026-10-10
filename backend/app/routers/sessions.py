from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import ResetResponse, SessionCreateRequest, SessionResponse

router = APIRouter(tags=["Sessions"])


@router.post("/demo/session", response_model=SessionResponse, status_code=201)
async def create_demo_session(
    body: SessionCreateRequest,
    uid: str = CurrentUser,
):
    """Initialize a demo session cloning from Sharma or Mehta synthetic scenarios."""
    raise NotImplementedException()


@router.post("/cases/{id}/reset", response_model=ResetResponse)
async def reset_case(
    id: str,
    uid: str = CurrentUser,
):
    """Reset a case back to its initial scenario state."""
    raise NotImplementedException()
