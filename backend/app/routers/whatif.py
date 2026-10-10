from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import WhatIfRequest, WhatIfResponse

router = APIRouter(tags=["What-If"])


@router.post("/cases/{id}/whatif", response_model=WhatIfResponse)
async def simulate_whatif(
    id: str,
    body: WhatIfRequest,
    uid: str = CurrentUser,
):
    """Simulate hypothetical scenario changes without mutating the real case graph."""
    raise NotImplementedException()
