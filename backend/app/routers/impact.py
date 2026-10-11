"""Macroeconomic and societal impact routes (P13 PART A)."""

from fastapi import APIRouter

from app.deps import CurrentUser
from app.models.schemas import ImpactResponse
from app.services.impact import get_impact_data

router = APIRouter(tags=["Impact"])


@router.get("/impact", response_model=ImpactResponse)
async def get_macro_impact(
    uid: str = CurrentUser,
):
    """Retrieve macro-economic and societal impact statistics on estate settlement in India."""
    return get_impact_data()
