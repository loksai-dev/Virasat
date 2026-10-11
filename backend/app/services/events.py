"""Event bus and SSE emitter for Virasat Agent runs.

Supports:
1. Spanner persistence of AgentEvent rows (seq per run) for cross-instance SSE polling.
2. In-memory async dispatch for instant sub-millisecond SSE delivery on the same node.
3. Live streaming with Last-Event-ID resume and periodic heartbeats.
"""

import asyncio
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from app.db.repositories import AgentEventRepo

logger = logging.getLogger(__name__)

# In-memory listeners per key (case_id or run_id)
_subscribers: dict[str, list[Callable[[dict[str, Any]], Any]]] = defaultdict(list)


def subscribe_case_events(key: str, callback: Callable[[dict[str, Any]], Any]) -> None:
    """Subscribe a callback to events for a specific key (case_id or run_id)."""
    _subscribers[key].append(callback)


def unsubscribe_case_events(key: str, callback: Callable[[dict[str, Any]], Any]) -> None:
    """Unsubscribe a callback from events."""
    if callback in _subscribers[key]:
        _subscribers[key].remove(callback)


def publish_case_event(key: str, event_type: str, data: dict[str, Any] | None = None) -> None:
    """Publish an event to in-memory listeners."""
    event = {
        "key": key,
        "event_type": event_type,
        "data": data or {},
    }
    listeners = list(_subscribers.get(key, [])) + list(_subscribers.get("*", []))
    for cb in listeners:
        try:
            if asyncio.iscoroutinefunction(cb):
                asyncio.create_task(cb(event))
            else:
                cb(event)
        except Exception as e:
            logger.warning("Error dispatching event to listener: %s", e)


class EventEmitter:
    """Agent pipeline event emitter persisting to Spanner and notifying SSE subscribers."""

    def __init__(self, run_id: str, case_id: str, initial_degraded: bool = False):
        self.run_id = run_id
        self.case_id = case_id
        self.degraded = initial_degraded
        self._current_progress = 0.0

    def emit(
        self,
        event_type: str,
        message: str = "",
        agent: str = "",
        progress: float | None = None,
        citations: list[str] | None = None,
        degraded: bool | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Emit an AgentEvent to Spanner and internal subscribers."""
        if degraded is not None:
            self.degraded = self.degraded or degraded
        if progress is not None:
            self._current_progress = progress

        is_deg = self.degraded
        cur_prog = self._current_progress
        c_list = list(citations or [])
        p_dict = dict(payload or {})

        seq = AgentEventRepo.append_event(
            run_id=self.run_id,
            event_type=event_type,
            agent=agent,
            message=message,
            citations=c_list,
            progress=cur_prog,
            degraded=is_deg,
            payload=p_dict,
        )

        event_data = {
            "run_id": self.run_id,
            "case_id": self.case_id,
            "seq": seq,
            "type": event_type,
            "event_type": event_type,
            "agent": agent,
            "message": message,
            "citations": c_list,
            "progress": cur_prog,
            "degraded": is_deg,
            "payload": p_dict,
        }

        # Dispatch locally to run_id listeners and case_id listeners
        publish_case_event(self.run_id, event_type, event_data)
        publish_case_event(self.case_id, event_type, event_data)

        logger.info(
            "[AgentRun %s][seq=%d][%s][%s] %s (prog=%.2f, degraded=%s)",
            self.run_id[:8], seq, agent or "orchestrator", event_type, message, cur_prog, is_deg
        )
        return event_data
