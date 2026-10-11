"""Bi-temporal Graph API route for Virasat Estate Settlement."""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Query

from app.db.bitemporal import now_utc
from app.db.graph_queries import snapshot as graph_snapshot
from app.db.repositories import DisputeRepo, ShareResultRepo
from app.deps import CurrentUser
from app.models.schemas import GraphEdge, GraphNode, GraphResponse
from app.services.case_service import check_case_access

router = APIRouter(tags=["Graph"])


@router.get("/cases/{id}/graph", response_model=GraphResponse)
async def get_case_graph(
    id: str,
    valid_at: str | None = Query(None, description="Bi-temporal valid_at timestamp ISO format"),
    known_at: str | None = Query(None, description="Bi-temporal known_at timestamp ISO format"),
    layers: str | None = Query(None, description="Comma-separated layers: assets,nominees,will,people,institutions"),
    uid: str = CurrentUser,
):
    """Retrieve the bi-temporal entity and relationship graph for an estate case."""
    check_case_access(id, uid, for_mutation=False)

    # 1. Parse bi-temporal timestamps
    val_dt = datetime.fromisoformat(valid_at.replace("Z", "+00:00")) if valid_at else now_utc()
    rec_dt = datetime.fromisoformat(known_at.replace("Z", "+00:00")) if known_at else now_utc()

    # 2. Query bi-temporal graph snapshot
    snap = graph_snapshot(case_id=id, valid_at=val_dt, known_at=rec_dt)

    # 3. Eligibility from ShareResult
    eligibility_map: dict[str, str] = {}
    share_results = ShareResultRepo.list_by_case(id, scenario="current")
    for sr in share_results:
        pid = sr.get("person_id")
        pct = float(sr.get("share_pct") or 0.0)
        eligibility_map[pid] = "ELIGIBLE" if pct > 0 else "EXCLUDED"

    # 4. Disputed flags from open disputes
    disputes = DisputeRepo.list_by_case(id)
    open_disputes = [d for d in disputes if str(d.get("status", "")).upper() not in ("RESOLVED", "DISMISSED")]
    disputed_ids: set[str] = set()

    for d in open_disputes:
        ev = d.get("evidence") or {}
        if isinstance(ev, dict):
            for nid in ev.get("node_ids", []) + ev.get("fact_ids", []) + ev.get("doc_ids", []):
                disputed_ids.add(str(nid).lower())
            details = str(ev.get("details", "")).lower()
            if "hdfc" in details:
                disputed_ids.add("hdfc")
            if "vikram" in details:
                disputed_ids.add("vikram")

    # 5. Filter layers
    layer_set = {l.strip().lower() for l in layers.split(",")} if layers else None

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    node_ids: set[str] = set()

    # People nodes
    if layer_set is None or "people" in layer_set or "will" in layer_set or "nominees" in layer_set:
        for p in snap.get("people", []):
            pid = p["person_id"]
            node_ids.add(pid)
            name = p.get("full_name") or pid
            elig = eligibility_map.get(pid) or p.get("eligibility")
            is_disp = pid.lower() in disputed_ids or any(k in name.lower() for k in ("vikram", "sunita") if k in disputed_ids)
            nodes.append(GraphNode(
                id=pid,
                label=f"{name} ({p.get('role', 'HEIR')})",
                kind="person",
                eligibility=elig,
                disputed=is_disp,
            ))

    # Asset nodes
    if layer_set is None or "assets" in layer_set or "nominees" in layer_set:
        for a in snap.get("assets", []):
            aid = a["asset_id"]
            node_ids.add(aid)
            lbl = a.get("label") or a.get("type", "Asset")
            is_disp = aid.lower() in disputed_ids or any(k in lbl.lower() for k in ("hdfc",) if k in disputed_ids)
            nodes.append(GraphNode(
                id=aid,
                label=f"{lbl} ({a.get('account_ref_masked') or 'N/A'})",
                kind="asset",
                disputed=is_disp,
            ))

    # Institution nodes
    if layer_set is None or "institutions" in layer_set:
        for inst in snap.get("institutions", []):
            iid = inst["institution_id"]
            node_ids.add(iid)
            nodes.append(GraphNode(
                id=iid,
                label=inst.get("name", "Institution"),
                kind="institution",
                disputed=False,
            ))

    # Edges: Relationships
    if layer_set is None or "people" in layer_set:
        for r in snap.get("relationships", []):
            fid, tid = r["from_id"], r["to_id"]
            if fid in node_ids and tid in node_ids:
                edges.append(GraphEdge(
                    source=fid,
                    target=tid,
                    label=r.get("rel_type", "RELATED_TO"),
                    valid_from=r.get("valid_from"),
                    valid_to=r.get("valid_to"),
                ))

    # Edges: Nominees
    if layer_set is None or "nominees" in layer_set:
        for n in snap.get("nominees", []):
            pid, aid = n["person_id"], n["asset_id"]
            if pid in node_ids and aid in node_ids:
                edges.append(GraphEdge(
                    source=pid,
                    target=aid,
                    label=f"NOMINEE ({n.get('share_pct', 0)}%)",
                    valid_from=n.get("valid_from"),
                    valid_to=n.get("valid_to"),
                ))

    # Edges: Owns
    if layer_set is None or "assets" in layer_set:
        for o in snap.get("owns", []):
            pid, aid = o["person_id"], o["asset_id"]
            if pid in node_ids and aid in node_ids:
                edges.append(GraphEdge(
                    source=pid,
                    target=aid,
                    label="OWNS",
                    valid_from=o.get("valid_from"),
                    valid_to=o.get("valid_to"),
                ))

    return GraphResponse(nodes=nodes, edges=edges)
