"""History routes for ChangeLog and bi-temporal mutation time-travel views."""

from typing import Any

from fastapi import APIRouter, Query

from app.deps import CurrentUser
from app.services.case_service import get_history

router = APIRouter(tags=["History"])


@router.get("/cases/{id}/history")
async def get_case_history(
    id: str,
    entity: str | None = Query(None, description="Entity type filter e.g. Person, Relationship, Asset, Nominee"),
    entity_id: str | None = Query(None, description="Entity identifier"),
    uid: str = CurrentUser,
) -> list[dict[str, Any]]:
    """Retrieve audit history and bi-temporal mutation changelog for a case."""
    return get_history(case_id=id, entity=entity, entity_id=entity_id, uid=uid)
