"""What-If scenario simulation routes (P13 PART B)."""

from fastapi import APIRouter

from app.deps import CurrentUser
from app.models.schemas import WhatIfRequest, WhatIfResponse
from app.services.whatif import simulate_whatif_changes

router = APIRouter(tags=["What-If"])


@router.post("/cases/{id}/whatif", response_model=WhatIfResponse)
async def simulate_whatif(
    id: str,
    body: WhatIfRequest,
    uid: str = CurrentUser,
):
    """Simulate hypothetical scenario changes without mutating the real case graph."""
    return simulate_whatif_changes(case_id=id, request=body, uid=uid)
