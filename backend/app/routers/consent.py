"""Consent routes for DPDP Act 2023 legal heir authorizations."""

from typing import Any

from fastapi import APIRouter, Body, Header

from app.deps import CurrentUser
from app.services.case_service import get_consent, update_consent

router = APIRouter(tags=["Consent"])


@router.get("/cases/{id}/consent")
async def get_consent_status(
    id: str,
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Get DPDP Act 2023 compliant consent status across all claimants and legal heirs."""
    return get_consent(case_id=id, uid=uid)


@router.put("/cases/{id}/consent")
async def update_consent_status(
    id: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Record consent grant, pending, or revocation from a claimant/party."""
    return update_consent(case_id=id, data=body, uid=uid, if_match=if_match)
