"""Change propagation engine with debounce and minimal stage planning (P13 PART B).

Features:
1. Subscribes to "case_changed" event from P6.
2. Debounces 3 seconds per case, then starts an AgentRun with trigger EDIT
   (or sets rerun_pending if a run is already active).
3. plan_rerun(change_log_entries) determines the minimum stages:
   - person/relationship/will change -> shares, explanations, claims, fraud
   - nominee change -> routes, affected_claims, nominee_checks
   - asset change -> asset_claim, aggregates
   - document change -> extraction, discovery, fraud, affected_claims
   - consent change -> consent_approvability (no model calls)
4. Emits case_stale and case_fresh on the case event stream.
"""

import asyncio
import logging
from typing import Any

from app.db.repositories import AgentRunRepo, CasesRepo, ChangeLogRepo
from app.services.events import publish_case_event, subscribe_case_events
from app.services.runs import run_manager

logger = logging.getLogger(__name__)


def plan_rerun(change_log_entries: list[dict[str, Any]]) -> list[str]:
    """Decide minimal pipeline stages to run based on recent mutations.

    person/relationship/will change -> shares, explanations, claims, fraud;
    nominee change -> routes, affected_claims, nominee_checks;
    asset change -> asset_claim, aggregates;
    document change -> extraction, discovery, fraud, affected_claims;
    consent change -> consent_approvability (no model calls).
    """
    if not change_log_entries:
        return ["shares", "claims", "fraud"]

    entities = {str(c.get("entity", "")).capitalize() for c in change_log_entries}
    stages: set[str] = set()

    if any(e in ("Person", "Relationship", "Will") for e in entities):
        stages.update(["shares", "explanations", "claims", "fraud"])

    if "Nominee" in entities:
        stages.update(["routes", "affected_claims", "nominee_checks"])

    if "Asset" in entities:
        stages.update(["asset_claim", "aggregates"])

    if "Document" in entities:
        stages.update(["extraction", "discovery", "fraud", "affected_claims"])

    if "Consent" in entities:
        stages.update(["consent_approvability"])

    return sorted(list(stages))


class ChangePropagator:
    """Listens for case mutations, debounces 3 seconds, and triggers minimal runs."""

    def __init__(self, debounce_seconds: float = 3.0):
        self.debounce_seconds = debounce_seconds
        self._debounce_tasks: dict[str, asyncio.Task] = {}
        self._pending_changes: dict[str, list[dict[str, Any]]] = {}

    def start(self) -> None:
        """Subscribe to all case_changed events across the platform."""
        subscribe_case_events("*", self.handle_case_event)
        logger.info("ChangePropagator active and listening for case_changed events.")

    def handle_case_event(self, event: dict[str, Any]) -> None:
        """Handle incoming case events."""
        event_type = event.get("event_type")
        if event_type != "case_changed":
            return

        case_id = event.get("key")
        if not case_id or case_id == "*":
            return

        change_data = event.get("data", {})
        self.schedule_change(case_id, change_data)

    def schedule_change(self, case_id: str, change_data: dict[str, Any]) -> None:
        """Schedule debounced re-run for a case."""
        # Immediately notify stream that case is stale
        publish_case_event(case_id, "case_stale", {"case_id": case_id, "stale": True})

        self._pending_changes.setdefault(case_id, []).append(change_data)

        # Cancel existing debounce task if still pending
        existing_task = self._debounce_tasks.get(case_id)
        if existing_task and not existing_task.done():
            existing_task.cancel()

        # Schedule new task
        self._debounce_tasks[case_id] = asyncio.create_task(
            self._debounced_trigger(case_id)
        )

    async def _debounced_trigger(self, case_id: str) -> None:
        """Wait debounce period, then plan and start run with trigger EDIT."""
        try:
            if self.debounce_seconds > 0:
                await asyncio.sleep(self.debounce_seconds)

            recent_changes = ChangeLogRepo.list_by_case(case_id, limit=20)
            stages = plan_rerun(recent_changes)

            # Check if only specific assets are affected by nominee/asset change
            target_asset_ids = None
            if "affected_claims" in stages or "routes" in stages:
                target_aids = []
                for c in recent_changes:
                    if str(c.get("entity", "")).capitalize() in ("Nominee", "Asset"):
                        eid = str(c.get("entity_id", ""))
                        if ":" in eid:
                            target_aids.append(eid.split(":")[0])
                        elif eid:
                            target_aids.append(eid)
                if target_aids:
                    target_asset_ids = list(set(target_aids))

            context = {}
            if target_asset_ids:
                context["target_asset_ids"] = target_asset_ids

            logger.info("Debounce elapsed for case %s. Triggering EDIT run with stages: %s", case_id, stages)
            run_manager.start_case_run(
                case_id=case_id,
                trigger_kind="EDIT",
                stages=stages,
                context=context,
            )

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Error in ChangePropagator for case %s: %s", case_id, e, exc_info=True)
        finally:
            self._debounce_tasks.pop(case_id, None)
            self._pending_changes.pop(case_id, None)

    def is_pending_or_active(self, case_id: str) -> bool:
        """Check if case has a debounced trigger pending, changes pending, or active run in flight."""
        task = self._debounce_tasks.get(case_id)
        if task and not task.done():
            return True
        if bool(self._pending_changes.get(case_id)):
            return True
        run_task = run_manager._active_tasks.get(case_id)
        if run_task and not run_task.done():
            return True
        return False

    async def trigger_now(self, case_id: str) -> dict[str, Any]:
        """Manually trigger immediate execution without debounce (useful for tests)."""
        existing_task = self._debounce_tasks.get(case_id)
        if existing_task and not existing_task.done():
            existing_task.cancel()
            self._debounce_tasks.pop(case_id, None)

        self._pending_changes.pop(case_id, None)

        recent_changes = ChangeLogRepo.list_by_case(case_id, limit=20)
        stages = plan_rerun(recent_changes)

        target_asset_ids = None
        if "affected_claims" in stages or "routes" in stages:
            target_aids = []
            for c in recent_changes:
                if str(c.get("entity", "")).capitalize() in ("Nominee", "Asset"):
                    eid = str(c.get("entity_id", ""))
                    if ":" in eid:
                        target_aids.append(eid.split(":")[0])
                    elif eid:
                        target_aids.append(eid)
            if target_aids:
                target_asset_ids = list(set(target_aids))

        context = {}
        if target_asset_ids:
            context["target_asset_ids"] = target_asset_ids

        run_rec, is_new = run_manager.start_case_run(
            case_id=case_id,
            trigger_kind="EDIT",
            stages=stages,
            context=context,
        )
        run_task = run_manager._active_tasks.get(case_id)
        if run_task:
            await run_task
        return run_rec


# Global singleton instance
change_propagator = ChangePropagator(debounce_seconds=3.0)
change_propagator.start()
