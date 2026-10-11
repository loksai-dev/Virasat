"""API routes for autonomous Agent Runs and Server-Sent Events (SSE) streaming."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, Request
from fastapi.responses import StreamingResponse

from app.services.documents import verify_case_access
from app.db.repositories import AgentRunRepo, CasesRepo
from app.deps import CurrentUser
from app.errors import NotFound
from app.models.schemas import RunCreateRequest, RunResponse
from app.services.runs import run_manager

router = APIRouter(tags=["Runs"])


def _format_run_response(run_record: dict[str, Any]) -> RunResponse:
    st = run_record.get("started_at")
    created_at = st.isoformat() if isinstance(st, datetime) else str(st or "")
    return RunResponse(
        run_id=run_record["run_id"],
        case_id=run_record["case_id"],
        status=run_record.get("status", "QUEUED"),
        created_at=created_at,
    )


@router.post("/cases/{id}/run", response_model=RunResponse, status_code=202)
async def start_case_run(
    id: str,
    body: RunCreateRequest | None = None,
    uid: str = CurrentUser,
):
    """Trigger an asynchronous multi-agent pipeline run for a case."""
    case = CasesRepo.get(id)
    if not case:
        raise NotFound(f"Case '{id}' not found.")

    verify_case_access(id, uid, allow_read_seed=False)

    run_record, _ = run_manager.start_case_run(case_id=id, trigger_kind="manual")
    return _format_run_response(run_record)


@router.get("/runs/{rid}", response_model=RunResponse)
async def get_run_status(
    rid: str,
    uid: str = CurrentUser,
):
    """Get the execution status of an agent run."""
    run = run_manager.get_run(rid)
    case_id = run["case_id"]
    verify_case_access(case_id, uid, allow_read_seed=True)
    return _format_run_response(run)


@router.get("/runs/{rid}/events")
async def get_run_events_sse(
    rid: str,
    request: Request,
    last_event_id: str | None = Header(None, alias="Last-Event-ID"),
    uid: str = CurrentUser,
):
    """Stream execution events (SSE) for a specific agent run."""
    run = run_manager.get_run(rid)
    case_id = run["case_id"]
    verify_case_access(case_id, uid, allow_read_seed=True)

    parsed_last_id = None
    if last_event_id and last_event_id.isdigit():
        parsed_last_id = int(last_event_id)

    stream_generator = run_manager.stream_run_events(rid, last_event_id=parsed_last_id)
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/cases/{id}/events")
async def get_case_events_sse(
    id: str,
    request: Request,
    last_event_id: str | None = Header(None, alias="Last-Event-ID"),
    uid: str = CurrentUser,
):
    """Stream pipeline events (SSE) for a case, emitting case_stale, case_fresh, and run events."""
    case = CasesRepo.get(id)
    if not case:
        raise NotFound(f"Case '{id}' not found.")

    verify_case_access(id, uid, allow_read_seed=True)

    parsed_last_id = int(last_event_id) if last_event_id and last_event_id.isdigit() else None
    stream_generator = run_manager.stream_case_events(id, last_event_id=parsed_last_id)
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
