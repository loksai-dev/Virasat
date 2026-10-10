from typing import Literal

from fastapi import APIRouter, Query

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import SharesResponse

router = APIRouter(tags=["Shares"])


@router.get("/cases/{id}/shares", response_model=SharesResponse)
async def get_case_shares(
    id: str,
    scenario: Literal["current", "with_will", "no_will"] = Query("current"),
    uid: str = CurrentUser,
):
    """Retrieve deterministic shares, Sankey flows, and citation-backed legal reasoning."""
    raise NotImplementedException()
