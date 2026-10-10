
from fastapi import APIRouter, Query

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import GraphResponse

router = APIRouter(tags=["Graph"])


@router.get("/cases/{id}/graph", response_model=GraphResponse)
async def get_case_graph(
    id: str,
    valid_at: str | None = Query(None, description="Bi-temporal valid_at timestamp ISO format"),
    known_at: str | None = Query(None, description="Bi-temporal known_at timestamp ISO format"),
    uid: str = CurrentUser,
):
    """Retrieve the bi-temporal entity and relationship graph for an estate case."""
    raise NotImplementedException()
