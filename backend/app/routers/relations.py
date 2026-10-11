"""Relationships routes for bi-temporal kinship edges."""

from typing import Any

from fastapi import APIRouter, Body, Header

from app.deps import CurrentUser
from app.services.case_service import create_relationship, delete_relationship, update_relationship

router = APIRouter(tags=["Relations"])


@router.post("/cases/{id}/relationships", status_code=201)
async def create_new_relationship(
    id: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Create a bi-temporal relationship between two individuals."""
    return create_relationship(case_id=id, data=body, uid=uid, if_match=if_match)


@router.patch("/relationships/{rid}")
async def update_existing_relationship(
    rid: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Supersede a bi-temporal relationship (closing old edge, inserting new edge)."""
    return update_relationship(rid=rid, data=body, uid=uid, if_match=if_match)


@router.delete("/relationships/{rid}")
async def delete_existing_relationship(
    rid: str,
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Close an active bi-temporal relationship without overwriting or hard-deleting."""
    return delete_relationship(rid=rid, uid=uid, if_match=if_match)
