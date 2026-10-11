"""Institution operational and savings routes (P13 PART A)."""

from fastapi import APIRouter, Query

from app.deps import CurrentUser
from app.models.schemas import (
    ClaimResponse,
    InstitutionDashboardResponse,
    InstitutionSavingsResponse,
)
from app.services.institution import (
    calculate_savings,
    get_all_institution_claims,
    get_institution_dashboard_data,
)

router = APIRouter(prefix="/institution", tags=["Institution"])


@router.get("/dashboard", response_model=InstitutionDashboardResponse)
async def get_institution_dashboard(
    uid: str = CurrentUser,
):
    """Retrieve operational dashboard for financial institutions processing claims."""
    return get_institution_dashboard_data()


@router.get("/claims", response_model=list[ClaimResponse])
async def get_institution_claims(
    uid: str = CurrentUser,
):
    """List pending and processed claims routed to financial institutions."""
    return get_all_institution_claims()


@router.get("/savings", response_model=InstitutionSavingsResponse)
async def calculate_institution_savings(
    claims_per_year: int = Query(..., description="Annual volume of estate claims"),
    uid: str = CurrentUser,
):
    """Calculate institutional operational cost and time savings using Virasat."""
    return calculate_savings(claims_per_year=claims_per_year)
