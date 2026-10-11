"""People routes for case heir, claimant, and deceased management."""

from typing import Any

from fastapi import APIRouter, Body, Header

from app.deps import CurrentUser
from app.services.case_service import create_person, delete_person, list_people, update_person

router = APIRouter(tags=["People"])


@router.get("/cases/{id}/people")
async def list_case_people(
    id: str,
    uid: str = CurrentUser,
) -> list[dict[str, Any]]:
    """List all people associated with a case."""
    return list_people(case_id=id, uid=uid)


@router.post("/cases/{id}/people", status_code=201)
async def add_person_to_case(
    id: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Add an heir, claimant, or deceased individual to a case."""
    return create_person(case_id=id, data=body, uid=uid, if_match=if_match)


@router.patch("/people/{pid}")
async def update_person_details(
    pid: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Update details of a person."""
    return update_person(person_id=pid, updates=body, uid=uid, if_match=if_match)


@router.delete("/people/{pid}")
async def delete_person_from_case(
    pid: str,
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Soft delete a person from a case and close all related edges."""
    return delete_person(person_id=pid, uid=uid, if_match=if_match)
