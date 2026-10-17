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
from app.agents.fraud_dispute import FraudDisputeAgent
from app.db.repositories import AgentRunRepo, AssetRepo, PersonRepo
from app.services.events import EventEmitter
from app.services.timing import PerfCollector, time_span

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
        stages: list[str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute the multi-agent pipeline, running all or targeted minimal stages."""
        logger.info("Starting pipeline run %s for case %s (stages=%s)", run_id, case_id, stages)

        # 1. Pipeline Start
        emitter.emit(
            event_type="run_started",
            message=f"Autonomous estate settlement pipeline started for case {case_id[:8]}.",
            progress=0.05,
        )
        AgentRunRepo.update_status(run_id, status="RUNNING")

        if not stages or "all" in stages:
            stage_set = {"extraction", "discovery", "shares", "claims", "fraud"}
        else:
            stage_set = set(stages)

        try:
            with PerfCollector() as collector, time_span("Full Pipeline Run", "full_run"):
                # 2. Stage 1: IntakeAgent
                if "extraction" in stage_set:
                    emitter.emit(event_type="progress", progress=0.10, message="Stage 1: Document intake and death verification.")
                    with time_span("Stage 1: Intake", "stage"):
                        await self.intake_agent.execute(
                            case_id=case_id,
                            prompt="Scan case documents, extract unextracted files, and verify death certificate.",
                            emitter=emitter,
                        )

                # 3. Stage 2: AssetDiscoveryAgent
                if "discovery" in stage_set:
                    emitter.emit(event_type="progress", progress=0.35, message="Stage 2: Financial and physical asset discovery.")
                    with time_span("Stage 2: Discovery", "stage"):
                        await self.discovery_agent.execute(
                            case_id=case_id,
                            prompt="Discover and reconcile all estate assets from financial statements, passbooks, and deeds.",
                            emitter=emitter,
                        )

                # 4. Stage 3: LegalEligibilityAgent
                if "shares" in stage_set:
                    emitter.emit(event_type="progress", progress=0.65, message="Stage 3: Legal succession and statutory share calculation.")
                    with time_span("Stage 3: Eligibility & Shares", "stage"):
                        await self.eligibility_agent.execute(
                            case_id=case_id,
                            prompt="Compute statutory succession shares for all scenarios and generate legal reasoning.",
                            emitter=emitter,
                        )

                # 5. Stage 4: ClaimsPackager and FraudDispute
                run_pack = any(s in stage_set for s in ("claims", "affected_claims", "routes", "asset_claim"))
                run_fraud = "fraud" in stage_set
                pack_res = {}
                fraud_res = {}

                if run_pack and run_fraud:
                    emitter.emit(event_type="progress", progress=0.85, message="Stage 4: Claims packaging and fraud detection (parallel).")
                    with time_span("Stage 4: Claims Packager & Fraud Dispute", "stage"):
                        pack_task = self.packager_agent.execute(
                            case_id=case_id,
                            prompt="Verify institution claim requirements.",
                            emitter=emitter,
                            context=context,
                        )
                        fraud_task = self.fraud_agent.execute(
                            case_id=case_id,
                            prompt="Analyze documents for affidavit tampering and disputes.",
                            emitter=emitter,
                        )
                        pack_res, fraud_res = await asyncio.gather(pack_task, fraud_task)
                elif run_pack:
                    emitter.emit(event_type="progress", progress=0.85, message="Targeted Stage: Refreshing affected institutional claims.")
                    with time_span("Stage 4: Claims Packager", "stage"):
                        pack_res = await self.packager_agent.execute(
                            case_id=case_id,
                            prompt="Refresh affected institutional claims.",
                            emitter=emitter,
                            context=context,
                        )
                elif run_fraud:
                    emitter.emit(event_type="progress", progress=0.85, message="Targeted Stage: Scanning estate vulnerabilities and fraud.")
                    with time_span("Stage 4: Fraud Dispute", "stage"):
                        fraud_res = await self.fraud_agent.execute(
                            case_id=case_id,
                            prompt="Analyze documents for affidavit tampering and disputes.",
                            emitter=emitter,
                        )
                elif "consent_approvability" in stage_set:
                    # No model calls: deterministic refresh of signer consent approvability
                    emitter.emit(event_type="progress", progress=0.90, message="Stage: Updating claim approvability against updated consent records.")
                    from app.services.claims import generate_claims_for_case
                    generate_claims_for_case(case_id, actor="ConsentUpdate")

                # 6. Build Final Summary
                final_assets = AssetRepo.list_by_case(case_id)
                final_people = PersonRepo.list_by_case(case_id)
                heirs_count = len([p for p in final_people if p.get("role") != "DECEASED"])
                assets_located = len(final_assets)
                claims_prepared = len(final_assets)
                disputes_found = fraud_res.get("disputes_count", 0) if isinstance(fraud_res, dict) else (1 if any("fraud" in str(p.get("notes", "")).lower() for p in final_people) else 0)

                summary = {
                    "assets_located": assets_located,
                    "heirs_verified": heirs_count,
                    "claims_prepared": claims_prepared,
                    "disputes_found": disputes_found,
                    "perf": collector.summary(),
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
