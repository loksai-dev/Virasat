from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import AdminCleanupResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/cleanup", response_model=AdminCleanupResponse)
async def cleanup_expired_sessions(
    uid: str = CurrentUser,
):
    """Clean up expired ephemeral demo sessions and transient data (Cloud Scheduler OIDC)."""
    raise NotImplementedException()
