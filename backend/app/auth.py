import logging

import firebase_admin
from fastapi import Header
from firebase_admin import auth as firebase_auth

from app.config import get_settings
from app.errors import Unauthorized

logger = logging.getLogger(__name__)

# Track if firebase admin has been initialized
_firebase_initialized = False


def ensure_firebase_initialized() -> None:
    """Initialize Firebase Admin SDK using Application Default Credentials."""
    global _firebase_initialized
    if not _firebase_initialized and not firebase_admin._apps:
        settings = get_settings()
        try:
            firebase_admin.initialize_app(options={"projectId": settings.GCP_PROJECT})
            _firebase_initialized = True
            logger.info("Firebase Admin initialized for project: %s", settings.GCP_PROJECT)
        except Exception as e:
            logger.warning("Failed to initialize Firebase Admin with default credentials: %s", e)


async def get_current_uid(
    authorization: str | None = Header(None, alias="Authorization"),
) -> str:
    """Verify Firebase ID token from 'Authorization: Bearer <token>' header and return UID.

    If DEMO_MODE is true and LOCAL_DEV_UID is configured, allow bypass for testing/local dev.
    """
    settings = get_settings()

    if not authorization:
        raise Unauthorized("Missing Authorization header")

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise Unauthorized("Invalid Authorization header format. Expected 'Bearer <token>'")

    token = parts[1]

    # Allow LOCAL_DEV_UID and test-user/dev-user token bypass when DEMO_MODE is true
    if settings.DEMO_MODE:
        if settings.LOCAL_DEV_UID and (token == settings.LOCAL_DEV_UID or token in ("local-dev", "test-token", "dev")):
            return settings.LOCAL_DEV_UID
        if token.startswith("test-user-") or token.startswith("dev-user-") or token.startswith("uid-"):
            return token

    ensure_firebase_initialized()

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise Unauthorized("Token payload missing user ID")
        return uid
    except Exception as e:
        logger.warning("Firebase token verification failed: %s", e)
        raise Unauthorized("Invalid or expired Firebase ID token") from e

