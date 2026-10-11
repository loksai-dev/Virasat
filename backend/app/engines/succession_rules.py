"""Deterministic succession rules engine for Virasat.

Applies statutory succession regimes and testamentary will bequests to an
estate snapshot with strict Decimal precision and auditable reasoning.

CRITICAL CONSTRAINTS:
- ZERO LLM CALLS: This engine is 100% deterministic code.
- LEGAL RULES ARE DATA flagged `needs_legal_review: true`.
- Rounding to paise occurs ONLY at the end, reconciling exactly with net estate.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, Literal

import yaml

# -----------------------------------------------------------------------------
# Engine Metadata & Legal Review Flag
# -----------------------------------------------------------------------------
NEEDS_LEGAL_REVIEW: bool = True

RULES_DIR = Path(__file__).resolve().parent.parent / "rules"


def _load_yaml_rule(filename: str) -> dict[str, Any]:
    rule_path = RULES_DIR / filename
    if not rule_path.exists():
        raise FileNotFoundError(f"Rules definition not found: {rule_path}")
    with open(rule_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data or {}


# Load rules at startup
HINDU_RULES = _load_yaml_rule("hindu_intestate.yaml")
TESTAMENTARY_RULES = _load_yaml_rule("testamentary.yaml")
ROUTES_RULES = _load_yaml_rule("routes.yaml")


# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------
@dataclass
class Share:
    """Represents an entitlement row for a person."""
    person_id: str
    asset_id: str | None
    share_pct: float
    amount_inr: Decimal
    rule_ids: list[str] = field(default_factory=list)
    clause_ids: list[str] = field(default_factory=list)
    route: str = "SUCCESSION"
    notes: list[str] = field(default_factory=list)


@dataclass
class ReasoningStep:
    step: int
    text: str
    rule_ids: list[str] = field(default_factory=list)


class Result:
    """Result returned by compute()."""

    def __init__(
        self,
        status: str = "success",
        error_code: str | None = None,
        shares: list[Share] | None = None,
        reasoning: list[dict[str, Any]] | None = None,
        note_codes_list: list[str] | None = None,
        payee_pct_map: dict[str, dict[str, float]] | None = None,
        person_amounts: dict[str, Decimal] | None = None,
        person_pcts: dict[str, float] | None = None,
    ) -> None:
        self.status = status
        self.error_code = error_code
        self.shares = shares or []
        self.reasoning = reasoning or []
        self._note_codes = note_codes_list or []
        self._payee_pct = payee_pct_map or {}
        self._person_amounts = person_amounts or {}
        self._person_pcts = person_pcts or {}

    def amount_by_person(self) -> dict[str, Decimal]:
        """Rupee amount per person, rounded to paise, summing to net estate."""
        return self._person_amounts

    def pct_by_person(self) -> dict[str, float]:
        """Percentage of the net estate per person (missing person = 0.0)."""
        return self._person_pcts

    def note_codes(self) -> list[str]:
        """List of codes or CODE:ref strings emitted during computation."""
        return self._note_codes

    def payee_pct(self, asset_id: str) -> dict[str, float]:
        """Map of person_id -> percentage for institution payees on an asset."""
        return self._payee_pct.get(asset_id, {})


# -----------------------------------------------------------------------------
# Graph & Relationship Resolution Helper
# -----------------------------------------------------------------------------
@dataclass
class PersonInfo:
    person_id: str
    full_name: str
    role: str
    sex: str
    alive: bool
    personal_law: str = "hindu"
    dod: str | None = None


def _parse_people(snapshot: dict[str, Any]) -> tuple[PersonInfo | None, dict[str, PersonInfo]]:
    """Parse people from snapshot, identifying the deceased and relatives."""
    people_raw = snapshot.get("people", [])
    deceased_obj = snapshot.get("deceased")
    case_obj = snapshot.get("case", {})

    deceased_id = None
    if isinstance(deceased_obj, dict):
        deceased_id = deceased_obj.get("person_id")
    elif case_obj:
        deceased_id = case_obj.get("deceased_person_id")

    people: dict[str, PersonInfo] = {}
    deceased_person: PersonInfo | None = None

    for p in people_raw:
        if isinstance(p, dict):
            pid = p.get("person_id") or p.get("id")
            role = p.get("role", "RELATIVE")
            sex = (p.get("sex") or "M").upper()
            alive = p.get("alive", True)
            if p.get("deleted"):
                continue
            pinfo = PersonInfo(
                person_id=str(pid),
                full_name=p.get("full_name") or str(pid),
                role=role.upper(),
                sex=sex,
                alive=bool(alive),
                personal_law=(p.get("personal_law") or "hindu").lower(),
                dod=p.get("dod"),
            )
            people[str(pid)] = pinfo
            if pinfo.role == "DECEASED" or pid == deceased_id:
                deceased_person = pinfo

    if not deceased_person and deceased_obj:
        d_id = deceased_obj.get("person_id", "DECEASED")
        deceased_person = PersonInfo(
            person_id=str(d_id),
            full_name=deceased_obj.get("full_name", "Deceased"),
            role="DECEASED",
            sex=(deceased_obj.get("sex") or "M").upper(),
            alive=False,
            personal_law=(deceased_obj.get("personal_law") or "hindu").lower(),
            dod=deceased_obj.get("dod"),
        )
        people[str(d_id)] = deceased_person

    return deceased_person, people


def _build_adj_graphs(
    snapshot: dict[str, Any], deceased_id: str
) -> tuple[dict[str, list[tuple[str, str]]], dict[str, list[tuple[str, str]]]]:
    """Build directed and undirected adjacency for relationship edges."""
    rels_raw = snapshot.get("relationships", [])
    # from_id -> list of (to_id, rel_type)
    out_edges = defaultdict(list)
    in_edges = defaultdict(list)

    for r in rels_raw:
        if isinstance(r, dict):
            f = str(r.get("from_id") or r.get("from_person_id") or "")
            t = str(r.get("to_id") or r.get("to_person_id") or "")
            rel = (r.get("rel_type") or r.get("relationship_type") or "").upper()
            if f and t and rel:
                out_edges[f].append((t, rel))
                in_edges[t].append((f, rel))

    return out_edges, in_edges


# -----------------------------------------------------------------------------
# Recursive Hindu Succession Branch Evaluation
# -----------------------------------------------------------------------------
def _evaluate_branch(
    parent_id: str,
    parent_sex: str,
    people: dict[str, PersonInfo],
    children_of: dict[str, list[str]],
    spouse_of: dict[str, list[str]],
) -> tuple[Decimal, dict[str, Decimal]]:
    """Evaluate branch of a predeceased child under Section 10 HSA (Rule HIN-S10-R4).

    Returns:
        (total_branch_units, {person_id: fraction_of_branch})
    """
    living_spouses = []
    if parent_sex == "M":
        # Predeceased son's widows inherit together as one unit
        living_spouses = [
            sid for sid in spouse_of.get(parent_id, [])
            if sid in people and people[sid].alive
        ]

    living_children = []
    predeceased_children = []

    for cid in children_of.get(parent_id, []):
        if cid in people:
            if people[cid].alive:
                living_children.append(cid)
            else:
                predeceased_children.append(cid)

    # Recursively evaluate sub-branches
    active_sub_branches: dict[str, tuple[Decimal, dict[str, Decimal]]] = {}
    for pc_id in predeceased_children:
        c_sex = people[pc_id].sex
        sub_units, sub_alloc = _evaluate_branch(pc_id, c_sex, people, children_of, spouse_of)
        if sub_units > 0:
            active_sub_branches[pc_id] = (sub_units, sub_alloc)

    # Total units within this branch
    units = Decimal(0)
    if living_spouses:
        units += Decimal(1)
    units += Decimal(len(living_children))
    units += Decimal(len(active_sub_branches))

    if units == 0:
        return Decimal(0), {}

    branch_allocations: dict[str, Decimal] = {}

    # Widow(s) together take one unit
    if living_spouses:
        spouse_share = (Decimal(1) / units) / Decimal(len(living_spouses))
        for sid in living_spouses:
            branch_allocations[sid] = branch_allocations.get(sid, Decimal(0)) + spouse_share

    # Each living child takes one unit
    for cid in living_children:
        child_share = Decimal(1) / units
        branch_allocations[cid] = branch_allocations.get(cid, Decimal(0)) + child_share

    # Sub-branches each take one unit, divided recursively
    for _pc_id, (_, sub_alloc) in active_sub_branches.items():
        sub_share = Decimal(1) / units
        for sub_pid, sub_frac in sub_alloc.items():
            branch_allocations[sub_pid] = branch_allocations.get(sub_pid, Decimal(0)) + (sub_share * sub_frac)

    return units, branch_allocations


def _compute_hindu_intestate_shares(
    deceased: PersonInfo,
    people: dict[str, PersonInfo],
    snapshot: dict[str, Any],
) -> tuple[dict[str, Decimal], list[str], list[str]]:
    """Determine Class I / Class II heirs and their statutory fractions under HSA 1956."""
    notes: list[str] = []
    rule_ids: list[str] = ["HIN-ORDER"]

    out_edges, in_edges = _build_adj_graphs(snapshot, deceased.person_id)
    dec_id = deceased.person_id

    # Track relationships
    children_of = defaultdict(list)
    spouse_of = defaultdict(list)
    parents_of = defaultdict(list)
    siblings = []

    # Process all edges in both directions
    all_edges: list[tuple[str, str, str]] = []
    for f, targets in out_edges.items():
        for t, rel in targets:
            all_edges.append((f, t, rel))

    for f, t, rel in all_edges:
        if rel in ["SPOUSE", "WIFE", "HUSBAND"]:
            spouse_of[f].append(t)
            spouse_of[t].append(f)
        elif rel in ["CHILD", "SON", "DAUGHTER"]:
            if t == dec_id:
                children_of[dec_id].append(f)
            elif f == dec_id:
                children_of[dec_id].append(t)
            else:
                children_of[t].append(f)
        elif rel in ["PARENT", "MOTHER", "FATHER"]:
            if t == dec_id:
                parents_of[dec_id].append(f)
            elif f == dec_id:
                parents_of[dec_id].append(t)
            else:
                parents_of[t].append(f)
        elif rel in ["SIBLING", "BROTHER", "SISTER"]:
            if f == dec_id and t != dec_id:
                siblings.append(t)
            elif t == dec_id and f != dec_id:
                siblings.append(f)

    # Also infer from PersonInfo.role directly for relatives of deceased
    for pid, p in people.items():
        if pid == dec_id:
            continue
        if p.role == "SPOUSE":
            spouse_of[dec_id].append(pid)
            spouse_of[pid].append(dec_id)
        elif p.role in ["CHILD", "SON", "DAUGHTER"]:
            if not any(pid in clist for clist in children_of.values()):
                children_of[dec_id].append(pid)
        elif p.role in ["PARENT", "MOTHER", "FATHER"]:
            parents_of[dec_id].append(pid)
        elif p.role in ["SIBLING", "BROTHER", "SISTER"]:
            siblings.append(pid)

    # Class I candidates directly related to deceased
    dec_spouses = [p for p in set(spouse_of.get(dec_id, [])) if p in people and people[p].alive]
    dec_children = [p for p in set(children_of.get(dec_id, [])) if p in people]

    living_sons = [p for p in dec_children if people[p].alive and people[p].sex == "M"]
    living_daughters = [p for p in dec_children if people[p].alive and people[p].sex == "F"]
    predeceased_sons = [p for p in dec_children if not people[p].alive and people[p].sex == "M"]
    predeceased_daughters = [p for p in dec_children if not people[p].alive and people[p].sex == "F"]

    # Mother / Father of deceased
    dec_parents = [p for p in set(parents_of.get(dec_id, [])) if p in people]
    mother = [p for p in dec_parents if people[p].alive and people[p].sex == "F"]
    father = [p for p in dec_parents if people[p].alive and people[p].sex == "M"]

    # Class II brothers and sisters
    living_brothers = [p for p in set(siblings) if p in people and people[p].alive and people[p].sex == "M"]
    living_sisters = [p for p in set(siblings) if p in people and people[p].alive and people[p].sex == "F"]

    # Evaluate branches of predeceased sons and daughters
    active_branches: dict[str, tuple[Decimal, dict[str, Decimal]]] = {}
    for son_id in predeceased_sons:
        b_units, b_alloc = _evaluate_branch(son_id, "M", people, children_of, spouse_of)
        if b_units > 0:
            active_branches[son_id] = (b_units, b_alloc)

    for d_id in predeceased_daughters:
        b_units, b_alloc = _evaluate_branch(d_id, "F", people, children_of, spouse_of)
        if b_units > 0:
            active_branches[d_id] = (b_units, b_alloc)

    # Class I units calculation
    class1_units = Decimal(0)
    if dec_spouses:
        class1_units += Decimal(1)  # HIN-S10-R1: all widows together take 1 share
        rule_ids.append("HIN-S10-R1")
    if living_sons or living_daughters or mother:
        class1_units += Decimal(len(living_sons) + len(living_daughters) + len(mother))
        rule_ids.append("HIN-S10-R2")
    if active_branches:
        class1_units += Decimal(len(active_branches))
        rule_ids.append("HIN-S10-R3")
        rule_ids.append("HIN-S10-R4")

    fractions: dict[str, Decimal] = {}

    if class1_units > 0:
        # Class I heirs exist
        rule_ids.append("HIN-CLASS1-MEMBERS")

        if dec_spouses:
            sp_share = (Decimal(1) / class1_units) / Decimal(len(dec_spouses))
            for sp_id in dec_spouses:
                fractions[sp_id] = fractions.get(sp_id, Decimal(0)) + sp_share

        for son_id in living_sons:
            fractions[son_id] = fractions.get(son_id, Decimal(0)) + (Decimal(1) / class1_units)

        for d_id in living_daughters:
            fractions[d_id] = fractions.get(d_id, Decimal(0)) + (Decimal(1) / class1_units)

        for m_id in mother:
            fractions[m_id] = fractions.get(m_id, Decimal(0)) + (Decimal(1) / class1_units)

        for _b_id, (_, b_alloc) in active_branches.items():
            b_share = Decimal(1) / class1_units
            for b_pid, b_frac in b_alloc.items():
                fractions[b_pid] = fractions.get(b_pid, Decimal(0)) + (b_share * b_frac)

        # Exclude Class II relatives
        for f_id in father:
            notes.append(f"CLASS_II_EXCLUDED:{f_id}")
            fractions[f_id] = Decimal(0)
        for bro_id in living_brothers:
            notes.append(f"CLASS_II_EXCLUDED:{bro_id}")
            fractions[bro_id] = Decimal(0)
        for sis_id in living_sisters:
            notes.append(f"CLASS_II_EXCLUDED:{sis_id}")
            fractions[sis_id] = Decimal(0)

        return fractions, notes, list(dict.fromkeys(rule_ids))

    # If no Class I heirs, evaluate Class II entries
    rule_ids.append("HIN-CLASS2")
    # Entry 1: FATHER
    if father:
        f_share = Decimal(1) / Decimal(len(father))
        for f_id in father:
            fractions[f_id] = f_share
        for bro_id in living_brothers:
            fractions[bro_id] = Decimal(0)
        for sis_id in living_sisters:
            fractions[sis_id] = Decimal(0)
        return fractions, notes, list(dict.fromkeys(rule_ids))

    # Entry 2: BROTHER, SISTER
    entry2_members = living_brothers + living_sisters
    if entry2_members:
        share = Decimal(1) / Decimal(len(entry2_members))
        for m_id in entry2_members:
            fractions[m_id] = share
        return fractions, notes, list(dict.fromkeys(rule_ids))

    # No modelled heirs
    return {}, ["NO_MODELLED_HEIRS"], list(dict.fromkeys(rule_ids))


# -----------------------------------------------------------------------------
# Main compute() Entry Point
# -----------------------------------------------------------------------------
def compute(
    snapshot: dict[str, Any],
    will: dict[str, Any] | None = None,
    scenario: Literal["current", "with_will", "no_will"] = "current",
) -> Result:
    """Compute deterministic succession distribution and auditable reasoning."""
    deceased, people = _parse_people(snapshot)
    if not deceased:
        return Result(status="error", error_code="DECEASED_NOT_FOUND")

    # Personal Law Check
    if deceased.personal_law != "hindu":
        return Result(
            status="regime_not_supported",
            error_code="REGIME_NOT_SUPPORTED",
            reasoning=[{"step": 1, "text": f"Regime '{deceased.personal_law}' is not supported in v1.", "rule_ids": []}],
        )

    if deceased.sex != "M":
        return Result(
            status="needs_manual_review",
            error_code="FEMALE_INTESTATE",
            reasoning=[{"step": 1, "text": "Female intestate succession is not encoded in v1.", "rule_ids": []}],
        )

    # 1. Evaluate Will Validity and Applicability
    will_status = (will.get("status") if will else "NONE") or "NONE"
    will_applied = False
    will_note = None

    if scenario == "no_will":
        will_applied = False
    elif scenario == "current":
        if will_status in ["REGISTERED", "VERIFIED"]:
            will_applied = True
            will_note = "WILL_APPLIED"
        elif will_status in ["DRAFT", "UNVERIFIED"]:
            will_applied = False
            will_note = "WILL_NOT_APPLIED"
    elif scenario == "with_will":
        if will_status in ["REGISTERED", "VERIFIED"]:
            will_applied = True
            will_note = "WILL_APPLIED"
        elif will_status in ["DRAFT", "UNVERIFIED"]:
            will_applied = True
            will_note = "WILL_APPLIED_BY_SCENARIO"

    # Validate will bequests if applied
    if will_applied and will:
        residuary = will.get("residuary") or {}
        if residuary:
            total_residuary = sum(Decimal(str(v)) for v in residuary.values())
            if total_residuary <= 0 or total_residuary > 100:
                return Result(status="error", error_code="WILL_INVALID_TOTAL")

        specific = will.get("specific") or []
        spec_by_asset = defaultdict(Decimal)
        for s in specific:
            pct = Decimal(str(s.get("pct", 0)))
            spec_by_asset[str(s.get("asset"))] += pct
        for _a_id, tot_pct in spec_by_asset.items():
            if tot_pct > 100:
                return Result(status="error", error_code="WILL_INVALID_TOTAL")

    # 2. Parse Assets, Nominees, and Routes
    assets_raw = snapshot.get("assets", [])
    nominees_raw = snapshot.get("nominees", [])

    # Map asset_id -> list of nominees
    nominees_by_asset: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for n in nominees_raw:
        if isinstance(n, dict):
            aid = str(n.get("asset_id") or "")
            if aid:
                nominees_by_asset[aid].append(n)

    notes_emitted: list[str] = []
    if will_note:
        notes_emitted.append(will_note)

    payee_pct_map: dict[str, dict[str, float]] = {}
    beneficiary_allocations: dict[str, Decimal] = defaultdict(Decimal)
    specific_allocations: dict[str, Decimal] = defaultdict(Decimal)
    residuary_assets: list[dict[str, Any]] = []
    total_liabilities = Decimal(0)
    net_estate_total = Decimal(0)

    # 3. Categorize Assets
    for a in assets_raw:
        aid = str(a.get("id") or a.get("asset_id"))
        atype = (a.get("type") or a.get("asset_type") or "PROPERTY").upper()
        val = Decimal(str(a.get("value_inr") if a.get("value_inr") is not None else a.get("est_value_inr", 0)))
        net_estate_total += val

        a_nominees = a.get("nominees") or nominees_by_asset.get(aid, [])
        payee_map = {}
        for nom in a_nominees:
            p_id = str(nom.get("p") or nom.get("person_id"))
            p_pct = float(nom.get("pct") if nom.get("pct") is not None else nom.get("share_pct", 0.0))
            payee_map[p_id] = p_pct
        if payee_map:
            payee_pct_map[aid] = payee_map

        type_cfg = ROUTES_RULES.get("types", {}).get(atype, {})
        route = type_cfg.get("route", "SUCCESSION")
        nominee_effect = type_cfg.get("nominee_effect")

        if val < 0 or route == "LIABILITY":
            total_liabilities += val
            continue

        if route == "NOMINEE_PAYOUT" and nominee_effect == "beneficiary" and a_nominees:
            # Policy with nominee leaves succession pool
            for p_id, p_pct in payee_map.items():
                beneficiary_allocations[p_id] += val * (Decimal(str(p_pct)) / Decimal(100))
            continue

        # Check for specific bequests on this asset
        total_spec_pct = Decimal(0)
        if will_applied and will and will.get("specific"):
            for s in will["specific"]:
                if str(s.get("asset")) == aid:
                    s_pid = str(s.get("p"))
                    s_pct = Decimal(str(s.get("pct", 0)))
                    s_val = val * (s_pct / Decimal(100))
                    specific_allocations[s_pid] += s_val
                    total_spec_pct += s_pct

        if total_spec_pct < Decimal(100):
            rem_val = val * ((Decimal(100) - total_spec_pct) / Decimal(100))
            residuary_assets.append({"asset_id": aid, "type": atype, "value_inr": rem_val, "nominees": a_nominees})

    # 4. Intestate Fraction Calculation
    intestate_fractions, intestate_notes, intestate_rule_ids = _compute_hindu_intestate_shares(
        deceased, people, snapshot
    )
    notes_emitted.extend(intestate_notes)

    # 5. Allocate Residuary Succession Assets
    residuary_allocations: dict[str, Decimal] = defaultdict(Decimal)
    total_residuary_val = sum((a["value_inr"] for a in residuary_assets), Decimal(0))

    if will_applied and will and will.get("residuary"):
        will_res = will["residuary"]
        total_will_pct = sum(Decimal(str(v)) for v in will_res.values())

        for p_id, pct_val in will_res.items():
            pct_dec = Decimal(str(pct_val))
            residuary_allocations[str(p_id)] += total_residuary_val * (pct_dec / Decimal(100))

        if total_will_pct < 100:
            notes_emitted.append("PARTIAL_INTESTACY")
            remaining_frac = (Decimal(100) - total_will_pct) / Decimal(100)
            for p_id, i_frac in intestate_fractions.items():
                residuary_allocations[p_id] += total_residuary_val * remaining_frac * i_frac
    else:
        # 100% Intestate succession
        for p_id, i_frac in intestate_fractions.items():
            residuary_allocations[p_id] += total_residuary_val * i_frac

    # 6. Check Nominee vs Beneficial Differences for Custodian Assets
    for a in residuary_assets:
        aid = a["asset_id"]
        atype = a["type"]
        type_cfg = ROUTES_RULES.get("types", {}).get(atype, {})
        if type_cfg.get("nominee_effect") == "custodian" and a["nominees"]:
            payees = payee_pct_map.get(aid, {})
            # Determine beneficial share percentage for this asset
            beneficial_pcts: dict[str, float] = {}
            if will_applied and will and will.get("residuary"):
                for pid, pval in will["residuary"].items():
                    beneficial_pcts[str(pid)] = float(pval)
            else:
                for pid, ifrac in intestate_fractions.items():
                    beneficial_pcts[str(pid)] = float(ifrac * Decimal(100))

            differs = False
            all_pids = set(payees.keys()) | set(beneficial_pcts.keys())
            for pid in all_pids:
                if abs(payees.get(pid, 0.0) - beneficial_pcts.get(pid, 0.0)) > 0.0001:
                    differs = True
                    break
            if differs:
                notes_emitted.append(f"NOMINEE_DIFFERS_FROM_SUCCESSION:{aid}")

    # 7. Total Positive Succession Amounts (Excluding Beneficiary Assets)
    positive_succession: dict[str, Decimal] = defaultdict(Decimal)
    all_parties = set(people.keys()) | set(beneficiary_allocations.keys()) | set(specific_allocations.keys()) | set(residuary_allocations.keys())

    for pid in all_parties:
        pos_val = specific_allocations.get(pid, Decimal(0)) + residuary_allocations.get(pid, Decimal(0))
        if pos_val > 0:
            positive_succession[pid] = pos_val

    total_positive_succession = sum(positive_succession.values(), Decimal(0))

    # 8. Apportion Liabilities Pro-Rata to Positive Succession Value
    liability_shares: dict[str, Decimal] = defaultdict(Decimal)
    if total_liabilities < 0:
        for pid, pos_val in positive_succession.items():
            if total_positive_succession > 0:
                liability_shares[pid] = total_liabilities * (pos_val / total_positive_succession)

    # 9. Compute Net Shares per Person
    exact_person_amounts: dict[str, Decimal] = defaultdict(Decimal)
    for pid in all_parties:
        net_val = (
            positive_succession.get(pid, Decimal(0))
            + liability_shares.get(pid, Decimal(0))
            + beneficiary_allocations.get(pid, Decimal(0))
        )
        exact_person_amounts[pid] = net_val

    # 10. Paise Rounding & Reconciliation
    # Quantize to 2 decimals, then allocate discrepancy to largest share (ties to lowest person_id)
    rounded_person_amounts: dict[str, Decimal] = {}
    for pid, amt in exact_person_amounts.items():
        rounded_person_amounts[pid] = amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    discrepancy = net_estate_total.quantize(Decimal("0.01")) - sum(rounded_person_amounts.values())
    if discrepancy != Decimal(0):
        paise_count = int(abs(discrepancy) / Decimal("0.01"))
        step = Decimal("0.01") if discrepancy > Decimal(0) else Decimal("-0.01")

        # Sort: largest share first, ties by lowest person_id alphabetically
        sorted_pids = sorted(
            exact_person_amounts.keys(),
            key=lambda p: (-exact_person_amounts[p], p),
        )
        for i in range(paise_count):
            target_pid = sorted_pids[i % len(sorted_pids)]
            rounded_person_amounts[target_pid] += step

    # Reconcile exact assert
    assert sum(rounded_person_amounts.values()) == net_estate_total.quantize(Decimal("0.01")), (
        f"Reconciliation error: sum={sum(rounded_person_amounts.values())} != net_estate={net_estate_total}"
    )

    # 11. Compute Percentage by Person
    person_pcts: dict[str, float] = {}
    for pid, amt in rounded_person_amounts.items():
        if net_estate_total != Decimal(0):
            pct = float((amt / net_estate_total) * Decimal(100))
            person_pcts[pid] = pct
        else:
            person_pcts[pid] = 0.0

    # Ensure all persons in snapshot have entries in results
    for pid in people:
        if pid != deceased.person_id:
            if pid not in rounded_person_amounts:
                rounded_person_amounts[pid] = Decimal(0)
            if pid not in person_pcts:
                person_pcts[pid] = 0.0

    # 12. Build Share Records & Reasoning
    shares_list: list[Share] = []
    for pid, amt in rounded_person_amounts.items():
        if pid == deceased.person_id:
            continue
        pct = person_pcts.get(pid, 0.0)
        shares_list.append(
            Share(
                person_id=pid,
                asset_id=None,
                share_pct=pct,
                amount_inr=amt,
                rule_ids=intestate_rule_ids,
                clause_ids=["HSA-1956-S8", "HSA-1956-S10"],
                route="SUCCESSION",
                notes=[n for n in notes_emitted if n.endswith(f":{pid}")],
            )
        )

    reasoning_list = [
        {
            "step": 1,
            "text": f"Regime evaluated under Hindu Succession Act, 1956 for deceased male {deceased.person_id}.",
            "rule_ids": ["HIN-ORDER"],
        },
        {
            "step": 2,
            "text": "Evaluated Class I relatives, surviving spouses, children and predeceased child branches.",
            "rule_ids": ["HIN-CLASS1-MEMBERS"],
        },
    ]

    if will_applied:
        reasoning_list.append({
            "step": 3,
            "text": f"Applied will under testamentary scenario '{scenario}'.",
            "rule_ids": ["WILL-APPLY"],
        })

    return Result(
        status="success",
        error_code=None,
        shares=shares_list,
        reasoning=reasoning_list,
        note_codes_list=notes_emitted,
        payee_pct_map=payee_pct_map,
        person_amounts=rounded_person_amounts,
        person_pcts=person_pcts,
    )
