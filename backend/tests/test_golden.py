"""Golden test suite for deterministic succession rules engine.

Loads backend/tests/golden/golden_cases.yaml and verifies all 30 golden cases
with full Decimal reconciliation and exact note citations.
"""

from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
import yaml

from app.engines.succession_rules import compute

GOLDEN_PATH = Path(__file__).resolve().parent / "golden" / "golden_cases.yaml"


def load_golden_spec() -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, dict[str, Any]]]:
    """Load golden_cases.yaml and build a case index."""
    with open(GOLDEN_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    defaults = data.get("defaults", {})
    cases = data.get("cases", [])
    cases_by_id = {c["id"]: c for c in cases}
    return defaults, cases, cases_by_id


DEFAULTS, CASES, CASES_BY_ID = load_golden_spec()


def snapshot_from_spec(
    case: dict[str, Any],
    defaults: dict[str, Any],
    cases_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Build an in-memory snapshot structure from test case spec."""
    law = case.get("law", defaults.get("law", "hindu"))
    deceased_sex = case.get("deceased_sex", defaults.get("deceased_sex", "M"))

    # Resolve assets (handles SAME_AS_G25)
    assets_spec = case.get("assets", defaults.get("assets", []))
    if isinstance(assets_spec, str) and assets_spec.startswith("SAME_AS_"):
        ref_id = assets_spec.replace("SAME_AS_", "")
        assets_spec = cases_by_id[ref_id].get("assets", defaults.get("assets", []))

    # Build Deceased Person
    dec_id = "DEC"
    people_list: list[dict[str, Any]] = [
        {
            "person_id": dec_id,
            "full_name": "Deceased",
            "role": "DECEASED",
            "sex": deceased_sex,
            "personal_law": law,
            "alive": False,
            "dod": "2026-01-01",
        }
    ]
    relationships_list: list[dict[str, Any]] = []

    # Parse people tokens
    # ID:ROLE[:flags] where ROLE can be SPOUSE_OF:<id> or CHILD_OF:<id>
    for token in case.get("people", []):
        parts = token.split(":")
        pid = parts[0]
        if len(parts) >= 3 and parts[1] in ("SPOUSE_OF", "CHILD_OF"):
            rel_kind = parts[1]
            target_id = parts[2]
            is_dead = "dead" in parts[3:]
            sex = "F" if rel_kind == "SPOUSE_OF" else "M"
            rel_type = "SPOUSE" if rel_kind == "SPOUSE_OF" else "CHILD"
            people_list.append({
                "person_id": pid,
                "full_name": pid,
                "role": rel_kind,
                "sex": sex,
                "alive": not is_dead,
            })
            relationships_list.append({
                "from_id": pid,
                "to_id": target_id,
                "rel_type": rel_type,
            })
        else:
            role = parts[1]
            is_dead = "dead" in parts[2:]
            sex = "M"
            rel_type = None

            if role in ("SPOUSE", "DAUGHTER", "MOTHER", "SISTER"):
                sex = "F"
            elif role in ("SON", "FATHER", "BROTHER"):
                sex = "M"

            if role == "SPOUSE":
                rel_type = "SPOUSE"
            elif role in ("SON", "DAUGHTER"):
                rel_type = "CHILD"
            elif role in ("MOTHER", "FATHER"):
                rel_type = "PARENT"
            elif role in ("BROTHER", "SISTER"):
                rel_type = "SIBLING"

            people_list.append({
                "person_id": pid,
                "full_name": pid,
                "role": role,
                "sex": sex,
                "alive": not is_dead,
            })
            if rel_type:
                relationships_list.append({
                    "from_id": pid,
                    "to_id": dec_id,
                    "rel_type": rel_type,
                })

    # Build Assets & Nominees
    assets_list: list[dict[str, Any]] = []
    nominees_list: list[dict[str, Any]] = []

    for a in assets_spec:
        aid = a["id"]
        atype = a["type"]
        val = a["value_inr"]
        a_noms = a.get("nominees", [])
        assets_list.append({
            "asset_id": aid,
            "type": atype,
            "value_inr": val,
            "nominees": a_noms,
        })
        for nom in a_noms:
            nominees_list.append({
                "person_id": nom["p"],
                "asset_id": aid,
                "share_pct": nom["pct"],
            })

    return {
        "case_id": case["id"],
        "case": {"deceased_person_id": dec_id},
        "deceased": people_list[0],
        "people": people_list,
        "relationships": relationships_list,
        "assets": assets_list,
        "nominees": nominees_list,
    }


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_golden_case(case: dict[str, Any]):
    """Execute each golden case and verify all expectations."""
    defaults = DEFAULTS
    snapshot = snapshot_from_spec(case, defaults, CASES_BY_ID)
    scenario = case.get("scenario", defaults.get("scenario", "current"))
    will = case.get("will", defaults.get("will", None))

    tolerance_pct = float(case.get("tolerance_pct", defaults.get("tolerance_pct", 0.0001)))
    tolerance_inr = Decimal(str(case.get("tolerance_inr", defaults.get("tolerance_inr", 0.02))))

    result = compute(snapshot, will=will, scenario=scenario)

    # 1. Error / Status Expectations
    if "expect_error" in case:
        assert result.status == "error" or result.error_code == case["expect_error"], (
            f"Case {case['id']}: expected error {case['expect_error']}, got {result.error_code} ({result.status})"
        )
        assert result.error_code == case["expect_error"]
        return

    if "expect_status" in case:
        assert result.status == case["expect_status"], (
            f"Case {case['id']}: expected status {case['expect_status']}, got {result.status}"
        )
        return

    assert result.status == "success", f"Case {case['id']}: computation failed with {result.status}: {result.error_code}"

    # 2. Total Net Estate Reconciliation
    amounts = result.amount_by_person()
    total_inr = sum(amounts.values())
    net_estate = sum(Decimal(str(a["value_inr"])) for a in snapshot["assets"])
    assert abs(total_inr - net_estate) <= tolerance_inr, (
        f"Case {case['id']}: total distributed {total_inr} != net estate {net_estate}"
    )

    if "expect_total_inr" in case:
        exp_total = Decimal(str(case["expect_total_inr"]))
        assert abs(total_inr - exp_total) <= tolerance_inr, (
            f"Case {case['id']}: expected total {exp_total}, got {total_inr}"
        )

    # 3. Rupee Amounts per Person
    if "expect_amounts_inr" in case:
        for p, exp_amt in case["expect_amounts_inr"].items():
            act_amt = amounts.get(p, Decimal(0))
            assert abs(act_amt - Decimal(str(exp_amt))) <= tolerance_inr, (
                f"Case {case['id']}: person {p} expected amount {exp_amt}, got {act_amt}"
            )

    # 4. Percentages per Person
    if "expect_pct" in case:
        pcts = result.pct_by_person()
        for p, exp_pct in case["expect_pct"].items():
            act_pct = pcts.get(p, 0.0)
            assert abs(act_pct - exp_pct) <= tolerance_pct, (
                f"Case {case['id']}: person {p} expected {exp_pct}%, got {act_pct}%"
            )

    # 5. Note Codes
    if "expect_notes" in case:
        actual_notes = result.note_codes()
        for exp_note in case["expect_notes"]:
            assert exp_note in actual_notes, (
                f"Case {case['id']}: expected note '{exp_note}' in {actual_notes}"
            )

    # 6. Payee Percentages
    if "expect_payee" in case:
        for aid, exp_payees in case["expect_payee"].items():
            act_payees = result.payee_pct(aid)
            for p, exp_p_pct in exp_payees.items():
                assert abs(act_payees.get(p, 0.0) - exp_p_pct) <= tolerance_pct, (
                    f"Case {case['id']}: asset {aid} payee {p} expected {exp_p_pct}%, got {act_payees.get(p)}%"
                )


def test_sharma_no_will_g25_specific():
    """Verify G25 specifically: Vikram (V) has 0 entitlement and CLASS_II_EXCLUDED cites HIN-ORDER."""
    case = CASES_BY_ID["G25"]
    snapshot = snapshot_from_spec(case, DEFAULTS, CASES_BY_ID)
    result = compute(snapshot, will=None, scenario="current")

    # Vikram has zero entitlement
    assert result.amount_by_person()["V"] == Decimal(0)
    assert result.pct_by_person()["V"] == 0.0

    # Note CLASS_II_EXCLUDED:V is emitted
    assert "CLASS_II_EXCLUDED:V" in result.note_codes()

    # Rule HIN-ORDER is cited in the reasoning / rule IDs
    all_rule_ids = set()
    for r in result.reasoning:
        all_rule_ids.update(r.get("rule_ids", []))
    for s in result.shares:
        all_rule_ids.update(s.rule_ids)

    assert "HIN-ORDER" in all_rule_ids
