"""Will routes for testamentary metadata and bequest declarations."""

from typing import Any

from fastapi import APIRouter, Body, Header

from app.deps import CurrentUser
from app.services.case_service import get_will, update_will

router = APIRouter(tags=["Will"])


@router.get("/cases/{id}/will")
async def get_case_will(
    id: str,
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Get will metadata, status, and bequest clauses for a case."""
    return get_will(case_id=id, uid=uid)


@router.put("/cases/{id}/will")
async def submit_case_will(
    id: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Submit or replace will details and testamentary bequests for a case."""
    return update_will(case_id=id, data=body, uid=uid, if_match=if_match)
