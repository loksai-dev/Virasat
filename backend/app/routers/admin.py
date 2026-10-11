from fastapi import APIRouter

from app.deps import CurrentUser
from app.models.schemas import AdminCleanupResponse
from app.services.sessions import cleanup_expired_sessions as do_cleanup

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/cleanup", response_model=AdminCleanupResponse)
async def cleanup_expired_sessions(
    uid: str = CurrentUser,
):
    """Clean up expired ephemeral demo sessions and transient data (Cloud Scheduler OIDC)."""
    deleted = do_cleanup()
    return AdminCleanupResponse(deleted_sessions=deleted, status="ok")
