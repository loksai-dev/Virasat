"""Placeholder agent implementations for P10 (ClaimsPackager) and P11 (FraudDispute).

Emit realistic events and allow parallel orchestrator execution until full P10/P11 implementation.
"""

import asyncio
import logging
from typing import Any

from app.agents.base import BaseAgent
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)


class ClaimsPackagerAgent(BaseAgent):
    """No-op placeholder agent for P10 Claims Packaging."""

    def __init__(self, settings=None):
        super().__init__(
            name="ClaimsPackagerAgent",
            instruction="Assemble claim packets according to institution rules and SLAs.",
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
            message="ClaimsPackagerAgent started: verifying institutional SLA requirements and claim packet checklists.",
        )
        await asyncio.sleep(0.05)  # brief async yield
        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message="Mapped claim requirements across banking, insurance, and mutual fund institutions.",
        )
        emitter.emit(
            event_type="agent_done",
            agent=self.name,
            message="ClaimsPackagerAgent completed preliminary packet structuring.",
        )
        return {"status": "success", "agent": self.name}


class FraudDisputeAgent(BaseAgent):
    """No-op placeholder agent for P11 Fraud & Dispute Analysis."""

    def __init__(self, settings=None):
        super().__init__(
            name="FraudDisputeAgent",
            instruction="Detect planted inconsistencies, affidavit tampering, and succession disputes.",
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
            message="FraudDisputeAgent started: analyzing affidavits and notary dates for contradictions.",
        )
        await asyncio.sleep(0.05)  # brief async yield
        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message="Cross-referencing claimant submissions against death certificate and family tree.",
        )
        emitter.emit(
            event_type="agent_done",
            agent=self.name,
            message="FraudDisputeAgent completed inconsistency scanning.",
        )
        return {"status": "success", "agent": self.name}
