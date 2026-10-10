"""Graph query interface for EstateGraph in Virasat.

All graph reads go through this module.
Supports:
1. GQL queries over the EstateGraph Property Graph
2. Plain-SQL join fallback when USE_SQL_FALLBACK is enabled
Both return identical data structures.
"""

from datetime import datetime
from typing import Any
from google.cloud import spanner
from google.cloud.spanner_v1.snapshot import Snapshot

from app.config import get_settings
from app.db.bitemporal import as_of_clause, now_utc
from app.db.client import run_in_snapshot


def _dict_from_row(keys: list[str], row: tuple) -> dict[str, Any]:
    """Convert Spanner row tuple to dict with string formatting for dates and decimals."""
    d = {}
    for k, v in zip(keys, row):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        else:
            d[k] = v
    return d


def query_graph_gql(
    snapshot: Snapshot,
    case_id: str,
    valid_at: datetime,
    known_at: datetime,
) -> dict[str, Any]:
    """Execute GQL graph queries over EstateGraph property graph."""
    params = {
        "case_id": case_id,
        "valid_at": valid_at,
        "known_at": known_at,
    }
    param_types = {
        "case_id": spanner.param_types.STRING,
        "valid_at": spanner.param_types.TIMESTAMP,
        "known_at": spanner.param_types.TIMESTAMP,
    }

    # 1. People nodes
    gql_people = """
    GRAPH EstateGraph
    MATCH (p:Person)
    WHERE p.case_id = @case_id AND p.deleted = FALSE
    RETURN
      p.person_id,
      p.case_id,
      p.full_name,
      p.role,
      p.sex,
      p.dob,
      p.dod,
      p.personal_law,
      p.alive,
      p.eligibility,
      p.notes
    ORDER BY p.person_id
    """
    people_keys = [
        "person_id", "case_id", "full_name", "role", "sex", "dob", "dod",
        "personal_law", "alive", "eligibility", "notes"
    ]
    people_rows = list(snapshot.execute_sql(gql_people, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
    people = [_dict_from_row(people_keys, r) for r in people_rows]

    # 2. Assets nodes
    gql_assets = """
    GRAPH EstateGraph
    MATCH (a:Asset)
    WHERE a.case_id = @case_id AND a.deleted = FALSE
    RETURN
      a.asset_id,
      a.case_id,
      a.institution_id,
      a.type,
      a.label,
      a.account_ref_masked,
      a.est_value_inr,
      a.ownership,
      a.source_doc_id,
      a.extraction_confidence,
      a.status
    ORDER BY a.asset_id
    """
    asset_keys = [
        "asset_id", "case_id", "institution_id", "type", "label",
        "account_ref_masked", "est_value_inr", "ownership", "source_doc_id",
        "extraction_confidence", "status"
    ]
    asset_rows = list(snapshot.execute_sql(gql_assets, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
    assets = [_dict_from_row(asset_keys, r) for r in asset_rows]

    # 3. Relationships edges (bi-temporal)
    gql_rels = """
    GRAPH EstateGraph
    MATCH (p1:Person)-[r:RELATED_TO]->(p2:Person)
    WHERE r.case_id = @case_id
      AND r.valid_from <= @valid_at AND @valid_at < r.valid_to
      AND r.recorded_from <= @known_at AND @known_at < r.recorded_to
    RETURN
      p1.person_id AS from_id,
      p2.person_id AS to_id,
      r.rel_type,
      r.case_id,
      r.valid_from,
      r.valid_to,
      r.recorded_from,
      r.recorded_to
    ORDER BY from_id, to_id, r.rel_type
    """
    rel_keys = [
        "from_id", "to_id", "rel_type", "case_id",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    rel_rows = list(snapshot.execute_sql(gql_rels, params=params, param_types=param_types))
    relationships = [_dict_from_row(rel_keys, r) for r in rel_rows]

    # 4. Nominees edges (bi-temporal)
    gql_nominees = """
    GRAPH EstateGraph
    MATCH (p:Person)-[n:NOMINATED_FOR]->(a:Asset)
    WHERE n.case_id = @case_id
      AND n.valid_from <= @valid_at AND @valid_at < n.valid_to
      AND n.recorded_from <= @known_at AND @known_at < n.recorded_to
    RETURN
      p.person_id,
      a.asset_id,
      n.case_id,
      n.share_pct,
      n.valid_from,
      n.valid_to,
      n.recorded_from,
      n.recorded_to
    ORDER BY a.asset_id, p.person_id
    """
    nominee_keys = [
        "person_id", "asset_id", "case_id", "share_pct",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    nominee_rows = list(snapshot.execute_sql(gql_nominees, params=params, param_types=param_types))
    nominees = [_dict_from_row(nominee_keys, r) for r in nominee_rows]

    # 5. Owns edges (bi-temporal)
    gql_owns = """
    GRAPH EstateGraph
    MATCH (p:Person)-[o:OWNS]->(a:Asset)
    WHERE o.case_id = @case_id
      AND o.valid_from <= @valid_at AND @valid_at < o.valid_to
      AND o.recorded_from <= @known_at AND @known_at < o.recorded_to
    RETURN
      p.person_id,
      a.asset_id,
      o.case_id,
      o.valid_from,
      o.valid_to,
      o.recorded_from,
      o.recorded_to
    ORDER BY p.person_id, a.asset_id
    """
    owns_keys = [
        "person_id", "asset_id", "case_id",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    owns_rows = list(snapshot.execute_sql(gql_owns, params=params, param_types=param_types))
    owns = [_dict_from_row(owns_keys, r) for r in owns_rows]

    # 6. Institutions (all institutions associated with the assets or system)
    sql_inst = """
    SELECT institution_id, name, kind, required_docs, sla_days
    FROM Institution
    ORDER BY institution_id
    """
    inst_keys = ["institution_id", "name", "kind", "required_docs", "sla_days"]
    inst_rows = list(snapshot.execute_sql(sql_inst))
    institutions = [_dict_from_row(inst_keys, r) for r in inst_rows]

    return {
        "case_id": case_id,
        "valid_at": valid_at.isoformat(),
        "known_at": known_at.isoformat(),
        "people": people,
        "relationships": relationships,
        "nominees": nominees,
        "owns": owns,
        "assets": assets,
        "institutions": institutions,
    }


def query_graph_sql(
    snapshot: Snapshot,
    case_id: str,
    valid_at: datetime,
    known_at: datetime,
) -> dict[str, Any]:
    """Execute SQL join fallback queries returning identical shape to GQL."""
    asof_rel, rel_params, rel_ptypes = as_of_clause(valid_at, known_at, prefix="r")
    asof_nom, nom_params, nom_ptypes = as_of_clause(valid_at, known_at, prefix="n")
    asof_own, own_params, own_ptypes = as_of_clause(valid_at, known_at, prefix="o")

    # 1. People
    sql_people = """
    SELECT
      person_id, case_id, full_name, role, sex, dob, dod,
      personal_law, alive, eligibility, notes
    FROM Person
    WHERE case_id = @case_id AND deleted = FALSE
    ORDER BY person_id
    """
    people_keys = [
        "person_id", "case_id", "full_name", "role", "sex", "dob", "dod",
        "personal_law", "alive", "eligibility", "notes"
    ]
    people_rows = list(snapshot.execute_sql(sql_people, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
    people = [_dict_from_row(people_keys, r) for r in people_rows]

    # 2. Assets
    sql_assets = """
    SELECT
      asset_id, case_id, institution_id, type, label, account_ref_masked,
      est_value_inr, ownership, source_doc_id, extraction_confidence, status
    FROM Asset
    WHERE case_id = @case_id AND deleted = FALSE
    ORDER BY asset_id
    """
    asset_keys = [
        "asset_id", "case_id", "institution_id", "type", "label",
        "account_ref_masked", "est_value_inr", "ownership", "source_doc_id",
        "extraction_confidence", "status"
    ]
    asset_rows = list(snapshot.execute_sql(sql_assets, params={"case_id": case_id}, param_types={"case_id": spanner.param_types.STRING}))
    assets = [_dict_from_row(asset_keys, r) for r in asset_rows]

    # 3. Relationships
    sql_rels = f"""
    SELECT
      r.from_id, r.to_id, r.rel_type, r.case_id,
      r.valid_from, r.valid_to, r.recorded_from, r.recorded_to
    FROM Relationship r
    WHERE r.case_id = @case_id AND {asof_rel}
    ORDER BY r.from_id, r.to_id, r.rel_type
    """
    p_rels = {"case_id": case_id, **rel_params}
    pt_rels = {"case_id": spanner.param_types.STRING, **rel_ptypes}
    rel_keys = [
        "from_id", "to_id", "rel_type", "case_id",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    rel_rows = list(snapshot.execute_sql(sql_rels, params=p_rels, param_types=pt_rels))
    relationships = [_dict_from_row(rel_keys, r) for r in rel_rows]

    # 4. Nominees
    sql_nom = f"""
    SELECT
      n.person_id, n.asset_id, n.case_id, n.share_pct,
      n.valid_from, n.valid_to, n.recorded_from, n.recorded_to
    FROM Nominee n
    WHERE n.case_id = @case_id AND {asof_nom}
    ORDER BY n.asset_id, n.person_id
    """
    p_nom = {"case_id": case_id, **nom_params}
    pt_nom = {"case_id": spanner.param_types.STRING, **nom_ptypes}
    nom_keys = [
        "person_id", "asset_id", "case_id", "share_pct",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    nom_rows = list(snapshot.execute_sql(sql_nom, params=p_nom, param_types=pt_nom))
    nominees = [_dict_from_row(nom_keys, r) for r in nom_rows]

    # 5. Owns
    sql_own = f"""
    SELECT
      o.person_id, o.asset_id, o.case_id,
      o.valid_from, o.valid_to, o.recorded_from, o.recorded_to
    FROM Owns o
    WHERE o.case_id = @case_id AND {asof_own}
    ORDER BY o.person_id, o.asset_id
    """
    p_own = {"case_id": case_id, **own_params}
    pt_own = {"case_id": spanner.param_types.STRING, **own_ptypes}
    own_keys = [
        "person_id", "asset_id", "case_id",
        "valid_from", "valid_to", "recorded_from", "recorded_to"
    ]
    own_rows = list(snapshot.execute_sql(sql_own, params=p_own, param_types=pt_own))
    owns = [_dict_from_row(own_keys, r) for r in own_rows]

    # 6. Institutions
    sql_inst = """
    SELECT institution_id, name, kind, required_docs, sla_days
    FROM Institution
    ORDER BY institution_id
    """
    inst_keys = ["institution_id", "name", "kind", "required_docs", "sla_days"]
    inst_rows = list(snapshot.execute_sql(sql_inst))
    institutions = [_dict_from_row(inst_keys, r) for r in inst_rows]

    return {
        "case_id": case_id,
        "valid_at": valid_at.isoformat(),
        "known_at": known_at.isoformat(),
        "people": people,
        "relationships": relationships,
        "nominees": nominees,
        "owns": owns,
        "assets": assets,
        "institutions": institutions,
    }


def snapshot(
    case_id: str,
    valid_at: datetime | None = None,
    known_at: datetime | None = None,
    use_sql_fallback: bool | None = None,
) -> dict[str, Any]:
    """Retrieve full estate snapshot for case_id at specified bi-temporal coordinates."""
    settings = get_settings()
    fallback = use_sql_fallback if use_sql_fallback is not None else settings.USE_SQL_FALLBACK

    v_at = valid_at if valid_at is not None else now_utc()
    k_at = known_at if known_at is not None else now_utc()

    def _query(snap: Snapshot) -> dict[str, Any]:
        if fallback:
            return query_graph_sql(snap, case_id, v_at, k_at)
        return query_graph_gql(snap, case_id, v_at, k_at)

    return run_in_snapshot(_query)
