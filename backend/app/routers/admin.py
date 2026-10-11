"""Admin routes for maintenance and automated lifecycle management."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import get_settings
from app.models.schemas import AdminCleanupResponse
from app.services.sessions import cleanup_expired_sessions as do_cleanup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


def verify_cloud_scheduler_oidc(
    authorization: str | None = Header(None, alias="Authorization"),
    x_cloudscheduler: str | None = Header(None, alias="X-CloudScheduler"),
) -> None:
    """Verify that caller is authenticated as Google Cloud Scheduler via OIDC."""
    settings = get_settings()

    # DEMO / Test mode bypass for verified test scheduler tokens
    if settings.DEMO_MODE:
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1].strip()
            if token in ("scheduler-oidc", "test-scheduler", "cloud-scheduler") or token.startswith("scheduler-"):
                return
        if x_cloudscheduler == "true":
            return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Cloud Scheduler OIDC Authorization header required",
        )

    token = authorization.split(" ", 1)[1].strip()
    expected_sa = getattr(settings, "SCHEDULER_SERVICE_ACCOUNT", "virasat-api@virasat-511210.iam.gserviceaccount.com")

    try:
        request_transport = google_requests.Request()
        claims = id_token.verify_oauth2_token(token, request_transport)
        email = claims.get("email")
        if email != expected_sa:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: OIDC service account '{email}' is not authorized to trigger admin cleanup",
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.warning("Cloud Scheduler OIDC token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid Cloud Scheduler OIDC token",
        ) from e


@router.post("/cleanup", response_model=AdminCleanupResponse)
async def cleanup_expired_sessions(
    _: None = Depends(verify_cloud_scheduler_oidc),
):
    """Clean up expired ephemeral demo sessions and transient data (Cloud Scheduler OIDC only)."""
    deleted = do_cleanup()
    return AdminCleanupResponse(deleted_sessions=deleted, status="ok")
