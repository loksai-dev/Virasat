from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import ImpactResponse

router = APIRouter(tags=["Impact"])


@router.get("/impact", response_model=ImpactResponse)
async def get_macro_impact(
    uid: str = CurrentUser,
):
    """Retrieve macro-economic and societal impact statistics on estate settlement in India."""
    raise NotImplementedException()
