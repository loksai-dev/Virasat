from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import ConsentResponse, ConsentUpdateRequest

router = APIRouter(tags=["Consent"])


@router.get("/cases/{id}/consent", response_model=ConsentResponse)
async def get_consent_status(
    id: str,
    uid: str = CurrentUser,
):
    """Get DPDP Act 2023 compliant consent status across all claimants and legal heirs."""
    raise NotImplementedException()


@router.put("/cases/{id}/consent", response_model=ConsentResponse)
async def update_consent_status(
    id: str,
    body: ConsentUpdateRequest,
    uid: str = CurrentUser,
):
    """Record consent grant or revocation from a claimant/party."""
    raise NotImplementedException()
