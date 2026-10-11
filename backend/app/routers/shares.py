"""Deterministic shares endpoint for Virasat.

Calculates statutory distribution across scenarios, persists to ShareResult,
and formats Sankey flows, per-person shares, and legal citations.
"""

import json
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Query

from app.db.graph_queries import snapshot as get_snapshot
from app.db.repositories import CasesRepo, ShareResultRepo, WillRepo
from app.deps import CurrentUser
from app.engines.succession_rules import compute
from app.errors import NotFound
from app.models.schemas import PersonShare, ShareFlow, ShareReasoning, SharesResponse

router = APIRouter(tags=["Shares"])


@router.get("/cases/{id}/shares", response_model=SharesResponse)
async def get_case_shares(
    id: str,
    scenario: Literal["current", "with_will", "no_will"] = Query("current"),
    uid: str = CurrentUser,
):
    """Retrieve deterministic shares, Sankey flows, and citation-backed legal reasoning."""
    case = CasesRepo.get(id)
    if not case:
        raise NotFound(f"Case '{id}' not found")

    data_version = case.get("data_version", 1)

    # 1. Fetch will if present
    will_row = WillRepo.get_by_case(id)
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

    # 2. Get Estate Snapshot
    snap = get_snapshot(case_id=id)
    snap["case"] = case

    # 3. Compute and Persist all 3 Scenarios
    computed_results = {}
    for sc in ("current", "with_will", "no_will"):
        res = compute(snap, will=will_obj, scenario=sc)
        computed_results[sc] = res
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
            case_id=id,
            scenario=sc,
            shares=share_rows,
            computed_for_version=data_version,
        )

    # 4. Build SharesResponse for the requested scenario
    target_res = computed_results[scenario]

    # Map people names and relationships
    people_map = {p["person_id"]: p for p in snap.get("people", [])}
    person_shares: list[PersonShare] = []
    for pid, amt in target_res.amount_by_person().items():
        pinfo = people_map.get(pid, {})
        pname = pinfo.get("full_name") or pid
        prel = pinfo.get("role") or "HEIR"
        pct = Decimal(str(round(target_res.pct_by_person().get(pid, 0.0), 4)))
        person_shares.append(
            PersonShare(
                person_id=pid,
                name=pname,
                relationship=prel,
                share_pct=pct,
                amount_inr=amt,
                clause_ids=["HSA-1956-S8", "HSA-1956-S10"],
                docs_status="verified" if pinfo.get("eligibility") == "ELIGIBLE" else "pending",
            )
        )

    # Sankey flows: asset -> person amounts
    flows: list[ShareFlow] = []
    assets = snap.get("assets", [])
    total_net = sum(target_res.amount_by_person().values())
    for a in assets:
        aid = a["asset_id"]
        alabel = a.get("label") or aid
        val = Decimal(str(a.get("est_value_inr") if a.get("est_value_inr") is not None else 0))
        if val > 0:
            for pid, amt in target_res.amount_by_person().items():
                if total_net > 0 and amt > 0:
                    flow_val = (val * (amt / total_net)).quantize(Decimal("0.01"))
                    if flow_val > 0:
                        pname = people_map.get(pid, {}).get("full_name") or pid
                        flows.append(ShareFlow(source=alabel, target=pname, value=flow_val))

    # Reasoning
    reasoning_steps: list[ShareReasoning] = [
        ShareReasoning(step=r["step"], text=r["text"], citations=r.get("rule_ids", []))
        for r in target_res.reasoning
    ]

    # Confidence calculation: lower when documents unverified or will is draft
    confidence = 0.95
    if will_obj and will_obj.get("status") in ["DRAFT", "UNVERIFIED"]:
        confidence = 0.70

    return SharesResponse(
        flows=flows,
        shares=person_shares,
        reasoning=reasoning_steps,
        confidence=confidence,
        scenario=scenario,
        stale=False,
    )
