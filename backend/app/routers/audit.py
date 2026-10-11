"""Audit routes for cryptographic tamper-evident SHA-256 hash chain verification."""

from typing import Any

from fastapi import APIRouter

from app.deps import CurrentUser
from app.services.case_service import get_audit, verify_audit

router = APIRouter(tags=["Audit"])


@router.get("/cases/{id}/audit")
async def get_case_audit_trail(
    id: str,
    uid: str = CurrentUser,
) -> list[dict[str, Any]]:
    """Retrieve hash-chained tamper-evident audit log entries for a case."""
    return get_audit(case_id=id, uid=uid)


@router.get("/cases/{id}/audit/verify")
async def verify_case_audit_chain(
    id: str,
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Cryptographically verify integrity of the SHA-256 audit log hash chain."""
    return verify_audit(case_id=id, uid=uid)
