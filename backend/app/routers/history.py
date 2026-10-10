from typing import Any

from fastapi import APIRouter, Query

from app.deps import CurrentUser
from app.errors import NotImplementedException

router = APIRouter(tags=["History"])


@router.get("/cases/{id}/history", response_model=list[dict[str, Any]])
async def get_case_history(
    id: str,
    entity: str | None = Query(None, description="Entity type filter e.g. relationship, asset"),
    entity_id: str | None = Query(None, description="Entity identifier"),
    uid: str = CurrentUser,
):
    """Retrieve audit history and bi-temporal mutation changelog for a case."""
    raise NotImplementedException()
