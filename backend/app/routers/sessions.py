from fastapi import APIRouter

from app.deps import CurrentUser
from app.models.schemas import ResetResponse, SessionCreateRequest, SessionResponse
from app.services.sessions import clone_seed, reset_case as do_reset_case

router = APIRouter(tags=["Sessions"])


@router.post("/demo/session", response_model=SessionResponse, status_code=201)
async def create_demo_session(
    body: SessionCreateRequest,
    uid: str = CurrentUser,
):
    """Initialize a demo session cloning from Sharma or Mehta synthetic scenarios."""
    new_case_id = clone_seed(seed_key=body.scenario, uid=uid, mode=body.mode)
    return SessionResponse(case_id=new_case_id)


@router.post("/cases/{id}/reset", response_model=ResetResponse)
async def reset_case(
    id: str,
    uid: str = CurrentUser,
):
    """Reset a case back to its initial scenario state."""
    res = do_reset_case(case_id=id, uid=uid)
    return ResetResponse(case_id=res["case_id"], status=res["status"])
