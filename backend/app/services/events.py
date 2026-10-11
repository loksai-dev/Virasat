"""Internal event bus for Virasat case mutations (used by SSE runs in P13)."""

import asyncio
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)

# In-memory listeners per case_id: list of async callbacks
_subscribers: dict[str, list[Callable[[dict[str, Any]], Any]]] = defaultdict(list)


def subscribe_case_events(case_id: str, callback: Callable[[dict[str, Any]], Any]) -> None:
    """Subscribe a callback to case change events."""
    _subscribers[case_id].append(callback)


def unsubscribe_case_events(case_id: str, callback: Callable[[dict[str, Any]], Any]) -> None:
    """Unsubscribe a callback from case change events."""
    if callback in _subscribers[case_id]:
        _subscribers[case_id].remove(callback)


def publish_case_event(case_id: str, event_type: str, data: dict[str, Any] | None = None) -> None:
    """Publish an internal case event (e.g., 'case_changed')."""
    event = {
        "case_id": case_id,
        "event_type": event_type,
        "data": data or {},
    }
    logger.debug("Publishing case event: %s for case %s", event_type, case_id)

    listeners = list(_subscribers.get(case_id, []))
    for cb in listeners:
        try:
            if asyncio.iscoroutinefunction(cb):
                asyncio.create_task(cb(event))
            else:
                cb(event)
        except Exception as e:
            logger.warning("Error dispatching event to listener: %s", e)
