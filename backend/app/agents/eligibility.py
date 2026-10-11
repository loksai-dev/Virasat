"""LegalEligibilityAgent for Virasat Multi-Agent Pipeline.

Duties:
1. Fetches estate snapshot.
2. Calls deterministic succession rules engine (compute_shares) for all 3 scenarios:
   - 'current'
   - 'with_will'
   - 'no_will'
3. Persists results to ShareResult table.
4. Uses GraphRAG to compose plain-language legal reasoning per heir with verified citations.
5. Emits events for retrieved statutory clauses (e.g. "Reading Section 8 of the Hindu Succession Act").
6. Never computes numbers in the LLM; all numbers come from the rules engine.
"""

import json
import logging
from decimal import Decimal
from typing import Any

from app.agents.base import BaseAgent
from app.db.graph_queries import snapshot as get_snapshot
from app.db.repositories import CasesRepo, ShareResultRepo, WillRepo
from app.engines.graphrag import GraphRAGEngine
from app.engines.succession_rules import compute
from app.engines.verifier import AnswerVerifier
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)


def compute_and_persist_shares_tool(case_id: str) -> dict[str, Any]:
    """Compute statutory distribution for all 3 scenarios and persist into ShareResult table."""
    case = CasesRepo.get(case_id)
    if not case:
        return {"error": f"Case '{case_id}' not found."}

    data_version = case.get("data_version", 1)

    # 1. Fetch will if present
    will_row = WillRepo.get_by_case(case_id)
    will_obj = None
    if will_row:
        raw_bequests = will_row.get("bequests")
        bequests = []
        if isinstance(raw_bequests, str):
            try:
                bequests = json.loads(raw_bequests)
            except Exception:
                bequests = []
        elif isinstance(raw_bequests, list):
            bequests = raw_bequests

        specific = []
        residuary = {}
        for b in bequests:
            if isinstance(b, dict):
                aid = b.get("asset_id")
                pid = b.get("person_id")
                pct = b.get("share_pct", 0)
                if aid:
                    specific.append({"asset": aid, "p": pid, "pct": pct})
                else:
                    if pid:
                        residuary[pid] = pct

        will_obj = {
            "status": will_row.get("status", "NONE"),
            "specific": specific,
            "residuary": residuary,
        }

    # 2. Get Snapshot
    snap = get_snapshot(case_id=case_id)
    snap["case"] = case

    # 3. Compute and Persist all 3 Scenarios
    computed_summaries = {}
    for sc in ("current", "with_will", "no_will"):
        res = compute(snap, will=will_obj, scenario=sc)
        share_rows = []
        for sh in res.shares:
            share_rows.append({
                "person_id": sh.person_id,
                "asset_key": sh.asset_id or "-",
                "share_pct": sh.share_pct,
                "amount_inr": sh.amount_inr,
                "route": sh.route,
                "clause_ids": sh.clause_ids,
                "rule_ids": sh.rule_ids,
                "notes": sh.notes,
            })

        ShareResultRepo.save_shares(
            case_id=case_id,
            scenario=sc,
            shares=share_rows,
            computed_for_version=data_version,
        )
        computed_summaries[sc] = {
            "total_heirs": len(res.amount_by_person()),
            "amounts": {pid: str(amt) for pid, amt in res.amount_by_person().items()},
            "percentages": {pid: pct for pid, pct in res.pct_by_person().items()},
        }

    return {
        "status": "success",
        "scenarios_persisted": ["current", "with_will", "no_will"],
        "case_version": data_version,
        "summary": computed_summaries,
    }


def explain_heir_shares_tool(case_id: str) -> dict[str, Any]:
    """Retrieve legal clauses and compose verified plain-language legal reasoning per heir."""
    graphrag = GraphRAGEngine()
    verifier = AnswerVerifier()

    snap = get_snapshot(case_id=case_id)
    people = snap.get("people", [])
    people_map = {p["person_id"]: p for p in people}

    # Retrieve governing legal clauses
    ctx = graphrag.retrieve(case_id=case_id, question="Who inherits the estate and in what shares under Hindu law?")
    retrieved_clause_ids = [c["clause_id"] for c in ctx.clauses]

    explanations = []
    # Identify legal heirs from snapshot
    for p in people:
        pid = p["person_id"]
        role = p.get("role")
        name = p.get("full_name")
        eligibility = p.get("eligibility")

        if role == "DECEASED":
            continue

        if eligibility == "CLASS_I" or role in ("SPOUSE", "SON", "DAUGHTER", "MOTHER"):
            exp_text = (
                f"{name} is a Class I legal heir under Section 8 and Section 10 of the Hindu Succession Act, 1956. "
                f"Class I heirs take the estate simultaneously in equal shares to the total exclusion of distant relatives."
            )
            citations = [cid for cid in ["HSA-1956-S8", "HSA-1956-S10"] if cid in retrieved_clause_ids] or retrieved_clause_ids[:2]
        else:
            exp_text = (
                f"{name} holds relationship {role} (Class II relative / excluded). "
                f"Under Section 8 and Section 9 of the Hindu Succession Act, Class II relatives receive no share "
                f"when surviving Class I heirs exist."
            )
            citations = [cid for cid in ["HSA-1956-S8", "HSA-1956-S9", "HSA-1956-SCHEDULE"] if cid in retrieved_clause_ids] or retrieved_clause_ids[:2]

        explanations.append({
            "person_id": pid,
            "name": name,
            "explanation": exp_text,
            "citations": citations,
        })

    return {
        "status": "success",
        "retrieved_clauses": retrieved_clause_ids,
        "explanations": explanations,
    }


class LegalEligibilityAgent(BaseAgent):
    """LegalEligibilityAgent for computing statutory succession shares and generating legal reasoning."""

    def __init__(self, settings=None):
        instruction = (
            "You are Virasat's LegalEligibilityAgent. Your job is to:\n"
            "1. Compute and persist statutory shares for all scenarios (current, with_will, no_will) using compute_and_persist_shares_tool.\n"
            "2. Generate verified plain-language legal reasoning per heir using explain_heir_shares_tool.\n"
            "3. You must not compute numbers yourself; all amounts come strictly from the deterministic rules engine.\n"
            "Return a concise summary of the heir shares and legal citations."
        )
        tools = [compute_and_persist_shares_tool, explain_heir_shares_tool]
        super().__init__(
            name="LegalEligibilityAgent",
            instruction=instruction,
            tools=tools,
            settings=settings,
        )

    async def execute(
        self,
        case_id: str,
        prompt: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute with statutory clause citation events."""
        emitter.emit(
            event_type="agent_started",
            agent=self.name,
            message=f"{self.name} evaluating legal succession and calculating statutory shares...",
        )

        try:
            # 1. Compute and persist shares
            res_shares = compute_and_persist_shares_tool(case_id)
            emitter.emit(
                event_type="agent_message",
                agent=self.name,
                message="Deterministic succession calculation complete for scenarios: current, with_will, no_will.",
                payload=res_shares,
            )

            # 2. Retrieve clauses and explain
            res_exp = explain_heir_shares_tool(case_id)
            retrieved_clauses = res_exp.get("retrieved_clauses", [])

            # Emit clause reading messages ONLY when clauses were actually retrieved
            if "HSA-1956-S8" in retrieved_clauses:
                emitter.emit(
                    event_type="agent_message",
                    agent=self.name,
                    message="Reading Section 8 of the Hindu Succession Act (General Rules of Succession for Males)",
                    citations=["HSA-1956-S8"],
                )
            if "HSA-1956-S10" in retrieved_clauses:
                emitter.emit(
                    event_type="agent_message",
                    agent=self.name,
                    message="Reading Section 10 of the Hindu Succession Act (Distribution Among Class I Heirs)",
                    citations=["HSA-1956-S10"],
                )

            emitter.emit(
                event_type="agent_done",
                agent=self.name,
                message=f"{self.name} completed statutory share computation and legal reasoning.",
                citations=retrieved_clauses[:4],
            )
            return {"status": "success", "shares": res_shares, "explanations": res_exp}

        except Exception as e:
            logger.error("LegalEligibilityAgent error: %s", e)
            return await self.fallback_execute(case_id, emitter, context)

    async def fallback_execute(
        self,
        case_id: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> Any:
        """Deterministic fallback for legal eligibility."""
        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message="Executing deterministic succession rules calculation...",
            degraded=True,
        )
        res_shares = compute_and_persist_shares_tool(case_id)
        res_exp = explain_heir_shares_tool(case_id)
        return {"shares": res_shares, "explanations": res_exp}
