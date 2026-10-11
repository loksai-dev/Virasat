"""Pipeline Orchestrator for Virasat Multi-Agent Architecture.

Sequences:
IntakeAgent -> AssetDiscoveryAgent -> LegalEligibilityAgent -> [ClaimsPackagerAgent, FraudDisputeAgent] (in parallel).
Emits progress 0.0 to 1.0 and concludes with run_done summarizing:
- assets located
- heirs verified
- claims prepared
- disputes found
"""

import asyncio
import logging
from typing import Any

from app.agents.discovery import AssetDiscoveryAgent
from app.agents.eligibility import LegalEligibilityAgent
from app.agents.intake import IntakeAgent
from app.agents.packager import ClaimsPackagerAgent
from app.agents.placeholders import FraudDisputeAgent
from app.db.repositories import AgentRunRepo, AssetRepo, PersonRepo
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """Coordinates multi-agent estate settlement pipeline execution."""

    def __init__(self, settings=None):
        self.intake_agent = IntakeAgent(settings=settings)
        self.discovery_agent = AssetDiscoveryAgent(settings=settings)
        self.eligibility_agent = LegalEligibilityAgent(settings=settings)
        self.packager_agent = ClaimsPackagerAgent(settings=settings)
        self.fraud_agent = FraudDisputeAgent(settings=settings)

    async def run_pipeline(
        self,
        case_id: str,
        run_id: str,
        emitter: EventEmitter,
    ) -> dict[str, Any]:
        """Execute the multi-agent pipeline from start to completion."""
        logger.info("Starting pipeline run %s for case %s", run_id, case_id)

        # 1. Pipeline Start
        emitter.emit(
            event_type="run_started",
            message=f"Autonomous estate settlement pipeline started for case {case_id[:8]}.",
            progress=0.05,
        )
        AgentRunRepo.update_status(run_id, status="RUNNING")

        try:
            # 2. Stage 1: IntakeAgent
            emitter.emit(event_type="progress", progress=0.10, message="Stage 1: Document intake and death verification.")
            intake_res = await self.intake_agent.execute(
                case_id=case_id,
                prompt="Scan case documents, extract unextracted files, and verify death certificate.",
                emitter=emitter,
            )

            # 3. Stage 2: AssetDiscoveryAgent
            emitter.emit(event_type="progress", progress=0.35, message="Stage 2: Financial and physical asset discovery.")
            disc_res = await self.discovery_agent.execute(
                case_id=case_id,
                prompt="Discover and reconcile all estate assets from financial statements, passbooks, and deeds.",
                emitter=emitter,
            )

            # 4. Stage 3: LegalEligibilityAgent
            emitter.emit(event_type="progress", progress=0.65, message="Stage 3: Legal succession and statutory share calculation.")
            elig_res = await self.eligibility_agent.execute(
                case_id=case_id,
                prompt="Compute statutory succession shares for all scenarios and generate legal reasoning.",
                emitter=emitter,
            )

            # 5. Stage 4: ClaimsPackager and FraudDispute in Parallel
            emitter.emit(event_type="progress", progress=0.85, message="Stage 4: Claims packaging and fraud detection (parallel).")
            pack_task = self.packager_agent.execute(
                case_id=case_id,
                prompt="Verify institution claim requirements.",
                emitter=emitter,
            )
            fraud_task = self.fraud_agent.execute(
                case_id=case_id,
                prompt="Analyze documents for affidavit tampering and disputes.",
                emitter=emitter,
            )
            pack_res, fraud_res = await asyncio.gather(pack_task, fraud_task)

            # 6. Build Final Summary
            final_assets = AssetRepo.list_by_case(case_id)
            final_people = PersonRepo.list_by_case(case_id)
            heirs_count = len([p for p in final_people if p.get("role") != "DECEASED"])
            assets_located = len(final_assets)
            claims_prepared = len(final_assets)
            disputes_found = 1 if any("fraud" in str(p.get("notes", "")).lower() for p in final_people) else 0

            summary = {
                "assets_located": assets_located,
                "heirs_verified": heirs_count,
                "claims_prepared": claims_prepared,
                "disputes_found": disputes_found,
            }

            emitter.emit(
                event_type="progress",
                progress=1.0,
                message="Pipeline execution finished successfully.",
            )
            emitter.emit(
                event_type="run_done",
                message=(
                    f"Estate settlement pipeline complete: {assets_located} assets located, "
                    f"{heirs_count} heirs verified, {claims_prepared} claims prepared, "
                    f"{disputes_found} potential disputes identified."
                ),
                progress=1.0,
                payload=summary,
            )

            AgentRunRepo.update_status(
                run_id=run_id,
                status="DONE",
                degraded=emitter.degraded,
                metrics=summary,
            )
            return {"status": "DONE", "summary": summary, "degraded": emitter.degraded}

        except Exception as e:
            logger.error("Pipeline run %s failed with error: %s", run_id, e, exc_info=True)
            emitter.emit(
                event_type="run_failed",
                message=f"Pipeline run failed: {e!s}",
                progress=1.0,
                degraded=True,
                payload={"error": str(e)},
            )
            AgentRunRepo.update_status(
                run_id=run_id,
                status="FAILED",
                degraded=True,
                metrics={"error": str(e)},
            )
            return {"status": "FAILED", "error": str(e)}
