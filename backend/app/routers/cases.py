from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import CaseDetail, Overview

router = APIRouter(tags=["Cases"])


@router.get("/cases/{id}", response_model=CaseDetail)
async def get_case(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve details for a specific case."""
    raise NotImplementedException()


@router.get("/cases/{id}/overview", response_model=Overview)
async def get_case_overview(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve full dashboard overview for an estate settlement case."""
    raise NotImplementedException()
