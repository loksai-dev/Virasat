"""Run Manager Service for Virasat Agent Pipeline.

Manages:
1. One active run per case concurrency (returning active run_id and setting rerun_pending).
2. Background execution of PipelineOrchestrator.
3. Follow-up pipeline execution when rerun_pending is True.
4. Server-Sent Events (SSE) streaming with 500 ms polling, Last-Event-ID support, and 15 s heartbeats.
"""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.agents.orchestrator import PipelineOrchestrator
from app.config import get_settings
from app.db.repositories import AgentEventRepo, AgentRunRepo, CasesRepo
from app.errors import NotFound
from app.services.events import EventEmitter, subscribe_case_events, unsubscribe_case_events

logger = logging.getLogger(__name__)


class RunManager:
    """Coordinates lifecycle of AgentRun instances and SSE event streams."""

    def __init__(self):
        self.orchestrator = PipelineOrchestrator()
        # Keep track of active asyncio background tasks per case_id and caller_uid
        self._active_tasks: dict[str, asyncio.Task] = {}
        self._active_uids: dict[str, str] = {}

    def start_case_run(
        self,
        case_id: str,
        trigger_kind: str = "manual",
        stages: list[str] | None = None,
        context: dict[str, Any] | None = None,
        caller_uid: str | None = None,
    ) -> tuple[dict[str, Any], bool]:
        """Start a new agent run or return existing active run with rerun_pending flag.

        Returns (run_dict, is_new_run).
        """
        case = CasesRepo.get(case_id)
        if not case:
            raise NotFound(f"Case '{case_id}' not found.")

        owner_uid = caller_uid or case.get("owner_uid")

        # 1. Global concurrency cap check
        settings = get_settings()
        active_count = len([t for t in self._active_tasks.values() if not t.done()])
        max_runs = getattr(settings, "MAX_CONCURRENT_RUNS", 10)
        if active_count >= max_runs:
            raise HTTPException(
                status_code=429,
                detail="System is currently at maximum pipeline capacity. Please retry shortly.",
            )

        # Check for currently active run on this case
        active_run = AgentRunRepo.get_active_by_case(case_id)
        if active_run:
            logger.info("Case %s already has active run %s. Setting rerun_pending = True.", case_id, active_run["run_id"])
            AgentRunRepo.set_rerun_pending(active_run["run_id"], pending=True)
            active_run["rerun_pending"] = True
            from app.services.events import publish_case_event
            publish_case_event(case_id, "case_stale", {"case_id": case_id, "run_id": active_run["run_id"], "stale": True})
            return active_run, False

        # 2. One active run per UID check (across different cases)
        if owner_uid and owner_uid != "system":
            for cid, task in list(self._active_tasks.items()):
                if cid != case_id and not task.done() and self._active_uids.get(cid) == owner_uid:
                    raise HTTPException(
                        status_code=429,
                        detail="Only one active pipeline run is permitted per user. Please wait for current run to finish.",
                    )

        # Create new AgentRun
        case_version = case.get("data_version", 1)
        run_record = AgentRunRepo.create(
            case_id=case_id,
            trigger_kind=trigger_kind,
            case_version=case_version,
        )
        run_id = run_record["run_id"]

        from app.services.events import publish_case_event
        publish_case_event(case_id, "case_stale", {"case_id": case_id, "run_id": run_id, "stale": True})

        # Spawn background execution
        task = asyncio.create_task(self._execute_run_pipeline(case_id, run_id, stages=stages, context=context))
        self._active_tasks[case_id] = task
        if owner_uid:
            self._active_uids[case_id] = owner_uid

        return run_record, True

    async def _execute_run_pipeline(
        self,
        case_id: str,
        run_id: str,
        stages: list[str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Internal worker executing pipeline and checking for rerun_pending follow-up."""
        from app.services.events import publish_case_event
        try:
            emitter = EventEmitter(run_id=run_id, case_id=case_id)
            await self.orchestrator.run_pipeline(case_id, run_id, emitter, stages=stages, context=context)

            # Check if rerun_pending was requested while this run was in flight
            current_run = AgentRunRepo.get(run_id)
            if current_run and current_run.get("rerun_pending"):
                logger.info("Run %s completed with rerun_pending=True. Launching follow-up run for case %s.", run_id, case_id)
                # Clear pending on finished run
                AgentRunRepo.set_rerun_pending(run_id, pending=False)

                # Fetch updated case version
                c = CasesRepo.get(case_id)
                new_ver = c.get("data_version", 1) if c else 1
                followup_run = AgentRunRepo.create(case_id=case_id, trigger_kind="rerun", case_version=new_ver)
                followup_task = asyncio.create_task(self._execute_run_pipeline(case_id, followup_run["run_id"], stages=stages, context=context))
                self._active_tasks[case_id] = followup_task
            else:
                self._active_tasks.pop(case_id, None)
                self._active_uids.pop(case_id, None)
                publish_case_event(case_id, "case_fresh", {"case_id": case_id, "run_id": run_id, "stale": False})

        except Exception as e:
            logger.error("Unexpected error in _execute_run_pipeline for run %s: %s", run_id, e, exc_info=True)
            self._active_tasks.pop(case_id, None)
            self._active_uids.pop(case_id, None)
            publish_case_event(case_id, "case_fresh", {"case_id": case_id, "run_id": run_id, "stale": False})

    def get_run(self, run_id: str) -> dict[str, Any]:
        """Fetch status and details of an AgentRun."""
        run = AgentRunRepo.get(run_id)
        if not run:
            raise NotFound(f"Run '{run_id}' not found.")
        return run

    async def stream_run_events(
        self,
        run_id: str,
        last_event_id: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream SSE events for a specific agent run.

        Features:
        - Polls Spanner AgentEvent table by increasing seq every 500 ms (cross-instance support).
        - Wakes up immediately on in-memory events for the same instance.
        - Supports Last-Event-ID resume.
        - Emits SSE heartbeats (': heartbeat\\n\\n') every 15 seconds.
        - Concludes gracefully when run_done or run_failed is reached.
        """
        run = AgentRunRepo.get(run_id)
        if not run:
            raise NotFound(f"Run '{run_id}' not found.")

        current_seq = last_event_id if last_event_id is not None else 0
        last_heartbeat_time = datetime.now(UTC)

        # In-memory queue for low-latency notifications
        event_queue: asyncio.Queue = asyncio.Queue()

        def _on_event(evt_data: dict[str, Any]):
            event_queue.put_nowait(evt_data)

        subscribe_case_events(run_id, _on_event)

        try:
            terminal_reached = False
            while not terminal_reached:
                # 1. Fetch any new events from Spanner >= current_seq + 1
                new_events = AgentEventRepo.list_events_after(run_id, after_seq=current_seq)

                for ev in new_events:
                    seq = ev["seq"]
                    if seq > current_seq:
                        current_seq = seq
                        ev_type = ev.get("event_type", "agent_message")
                        # Format SSE payload
                        data_payload = json.dumps({
                            "seq": ev["seq"],
                            "type": ev_type,
                            "agent": ev.get("agent", ""),
                            "message": ev.get("message", ""),
                            "progress": ev.get("progress", 0.0),
                            "citations": ev.get("citations", []),
                            "degraded": ev.get("degraded", False),
                            "payload": ev.get("payload", {}),
                        })
                        yield f"id: {seq}\nevent: {ev_type}\ndata: {data_payload}\n\n"

                        if ev_type in ("run_done", "run_failed"):
                            terminal_reached = True
                            break

                if terminal_reached:
                    break

                # 2. Check if run has finished in database even if terminal event missed
                run_state = AgentRunRepo.get(run_id)
                if run_state and run_state.get("status") in ("DONE", "FAILED"):
                    # Double-check if we processed all events
                    remaining = AgentEventRepo.list_events_after(run_id, after_seq=current_seq)
                    if not remaining:
                        terminal_reached = True
                        break

                # 3. Wait for in-memory signal or 500 ms poll interval
                try:
                    await asyncio.wait_for(event_queue.get(), timeout=0.5)
                except TimeoutError:
                    pass

                # 4. Heartbeat check (every 15 s)
                now = datetime.now(UTC)
                if (now - last_heartbeat_time).total_seconds() >= 15.0:
                    yield ": heartbeat\n\n"
                    last_heartbeat_time = now

        finally:
            unsubscribe_case_events(run_id, _on_event)

    async def stream_case_events(
        self,
        case_id: str,
        last_event_id: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream SSE events for a case including case_stale, case_fresh, and run events."""
        event_queue: asyncio.Queue = asyncio.Queue()

        def _on_event(evt_data: dict[str, Any]):
            event_queue.put_nowait(evt_data)

        subscribe_case_events(case_id, _on_event)

        # Check initial state
        active_run = AgentRunRepo.get_active_by_case(case_id)
        is_stale = active_run is not None
        initial_ev = "case_stale" if is_stale else "case_fresh"
        yield f"event: {initial_ev}\ndata: {json.dumps({'case_id': case_id, 'stale': is_stale})}\n\n"

        current_seq = last_event_id if last_event_id is not None else 0
        last_heartbeat_time = datetime.now(UTC)

        try:
            while True:
                # 1. Process any events queued from in-memory dispatch
                while not event_queue.empty():
                    evt = await event_queue.get()
                    ev_type = evt.get("event_type", "message")
                    data = evt.get("data") if "data" in evt else evt
                    seq = evt.get("seq") or (evt.get("data", {}).get("seq") if isinstance(evt.get("data"), dict) else None)
                    id_str = f"id: {seq}\n" if seq else ""
                    yield f"{id_str}event: {ev_type}\ndata: {json.dumps(data)}\n\n"

                # 2. Check active run events from Spanner
                active_run = AgentRunRepo.get_active_by_case(case_id)
                if active_run:
                    rid = active_run["run_id"]
                    new_events = AgentEventRepo.list_events_after(rid, after_seq=current_seq)
                    for ev in new_events:
                        seq = ev["seq"]
                        if seq > current_seq:
                            current_seq = seq
                            ev_type = ev.get("event_type", "agent_message")
                            data_payload = json.dumps({
                                "seq": ev["seq"],
                                "type": ev_type,
                                "agent": ev.get("agent", ""),
                                "message": ev.get("message", ""),
                                "progress": ev.get("progress", 0.0),
                                "citations": ev.get("citations", []),
                                "degraded": ev.get("degraded", False),
                                "payload": ev.get("payload", {}),
                            })
                            yield f"id: {seq}\nevent: {ev_type}\ndata: {data_payload}\n\n"

                # 3. Wait with timeout
                try:
                    evt = await asyncio.wait_for(event_queue.get(), timeout=0.5)
                    event_queue.put_nowait(evt)
                except TimeoutError:
                    pass

                # 4. Heartbeat check (every 15 s)
                now = datetime.now(UTC)
                if (now - last_heartbeat_time).total_seconds() >= 15.0:
                    yield ": heartbeat\n\n"
                    last_heartbeat_time = now

        finally:
            unsubscribe_case_events(case_id, _on_event)


# Global singleton instance
run_manager = RunManager()

