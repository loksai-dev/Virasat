from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import RunCreateRequest, RunResponse

router = APIRouter(tags=["Runs"])


@router.post("/cases/{id}/run", response_model=RunResponse, status_code=202)
async def start_case_run(
    id: str,
    body: RunCreateRequest,
    uid: str = CurrentUser,
):
    """Trigger an asynchronous multi-agent pipeline run for a case."""
    raise NotImplementedException()


@router.get("/runs/{rid}", response_model=RunResponse)
async def get_run_status(
    rid: str,
    uid: str = CurrentUser,
):
    """Get the execution status of an agent run."""
    raise NotImplementedException()


@router.get("/runs/{rid}/events")
async def get_run_events_sse(
    rid: str,
    uid: str = CurrentUser,
):
    """Stream execution events (SSE) for a specific agent run."""
    raise NotImplementedException()


@router.get("/cases/{id}/events")
async def get_case_events_sse(
    id: str,
    uid: str = CurrentUser,
):
    """Stream all pipeline events (SSE) for a case."""
    raise NotImplementedException()
