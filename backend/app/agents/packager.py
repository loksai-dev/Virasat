"""Claims Packager Agent (P10).

Evaluates asset settlement routes, compiles checklists against uploaded documents,
pre-fills institutional deceased claim forms with stored provenance, maps required signers
with DPDP Act consent status, and generates PDF claim packets.
"""

import asyncio
import logging
from typing import Any

from app.agents.base import BaseAgent
from app.services.claims import generate_claims_for_case
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)


class ClaimsPackagerAgent(BaseAgent):
    """Autonomous agent that builds and refreshes institutional claim packets."""

    def __init__(self, settings=None):
        super().__init__(
            name="ClaimsPackagerAgent",
            instruction=(
                "For every non-deleted estate asset with an institution, evaluate rules engine results, "
                "determine the claim route, evaluate the document checklist, pre-fill claim forms from stored "
                "data provenance, map signer consent statuses, and compile formal PDF claim packets."
            ),
            tools=[],
            settings=settings,
        )

    async def execute(
        self,
        case_id: str,
        prompt: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        emitter.emit(
            event_type="agent_started",
            agent=self.name,
            message="ClaimsPackagerAgent started: assembling institutional claim packets and evaluating checklists.",
        )
        await asyncio.sleep(0.02)

        emitter.emit(
            event_type="tool_call",
            agent=self.name,
            tool="generate_claims_for_case",
            args={"case_id": case_id},
        )

        claims = generate_claims_for_case(case_id, actor=self.name)
        ready_count = sum(1 for c in claims if c.get("status") == "READY")
        needs_action_count = sum(1 for c in claims if c.get("status") == "NEEDS_ACTION")

        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message=(
                f"Generated {len(claims)} institutional claim packets: "
                f"{ready_count} READY for submission, {needs_action_count} require further action or documentation."
            ),
        )

        emitter.emit(
            event_type="agent_done",
            agent=self.name,
            message="ClaimsPackagerAgent completed claim packet assembly and checklist validation.",
        )

        return {
            "status": "success",
            "agent": self.name,
            "claims_count": len(claims),
            "ready_count": ready_count,
            "needs_action_count": needs_action_count,
        }
