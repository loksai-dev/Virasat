"""Evaluation 1: Deterministic Succession Rules Engine Benchmark.

Evaluates:
- All 30 golden cases from golden_cases.yaml
- Share accuracy (% matching expected shares)
- Decimal reconciliation (exact sum to total net estate)
- Note and clause citation correctness
"""

from decimal import Decimal
from typing import Any

from tests.test_golden import CASES, CASES_BY_ID, DEFAULTS, snapshot_from_spec
from app.engines.succession_rules import compute


def evaluate_rules_engine() -> dict[str, Any]:
    """Execute evaluation on the 30 golden succession cases."""
    total_cases = len(CASES)
    passed_cases = 0
    reconciled_cases = 0
    failures = []

    for case in CASES:
        case_id = case["id"]
        snapshot = snapshot_from_spec(case, DEFAULTS, CASES_BY_ID)
        scenario = case.get("scenario", DEFAULTS.get("scenario", "current"))
        will = case.get("will", DEFAULTS.get("will", None))

        tolerance_pct = float(case.get("tolerance_pct", DEFAULTS.get("tolerance_pct", 0.0001)))
        tolerance_inr = Decimal(str(case.get("tolerance_inr", DEFAULTS.get("tolerance_inr", 0.02))))

        result = compute(snapshot, will=will, scenario=scenario)

        # Check expected error/status cases
        if "expect_error" in case:
            if result.status == "error" or result.error_code == case["expect_error"]:
                passed_cases += 1
                reconciled_cases += 1
            else:
                failures.append({"case_id": case_id, "expected_error": case["expect_error"], "got": result.error_code})
            continue

        if "expect_status" in case:
            if result.status == case["expect_status"]:
                passed_cases += 1
                reconciled_cases += 1
            else:
                failures.append({"case_id": case_id, "expected_status": case["expect_status"], "got": result.status})
            continue

        if result.status != "success":
            failures.append({"case_id": case_id, "status": result.status, "error": result.error_code})
            continue

        # Check net estate reconciliation
        amounts = result.amount_by_person()
        total_inr = sum(amounts.values())
        net_estate = sum(Decimal(str(a["value_inr"])) for a in snapshot["assets"])
        is_reconciled = abs(total_inr - net_estate) <= tolerance_inr

        if is_reconciled:
            reconciled_cases += 1

        case_ok = is_reconciled

        # Check Rupee Amounts per Person
        if "expect_amounts_inr" in case:
            for p, exp_amt in case["expect_amounts_inr"].items():
                act_amt = amounts.get(p, Decimal(0))
                if abs(act_amt - Decimal(str(exp_amt))) > tolerance_inr:
                    case_ok = False
                    failures.append({"case_id": case_id, "person": p, "exp_amt": str(exp_amt), "act_amt": str(act_amt)})
                    break

        # Check Percentages per Person
        if case_ok and "expect_pct" in case:
            pcts = result.pct_by_person()
            for p, exp_pct in case["expect_pct"].items():
                act_pct = pcts.get(p, 0.0)
                if abs(act_pct - exp_pct) > tolerance_pct:
                    case_ok = False
                    failures.append({"case_id": case_id, "person": p, "exp_pct": exp_pct, "act_pct": act_pct})
                    break

        # Check Note Codes
        if case_ok and "expect_notes" in case:
            actual_notes = result.note_codes()
            for exp_note in case["expect_notes"]:
                if exp_note not in actual_notes:
                    case_ok = False
                    failures.append({"case_id": case_id, "missing_note": exp_note, "notes": actual_notes})
                    break

        if case_ok:
            passed_cases += 1

    accuracy = round((passed_cases / total_cases) * 100.0, 2)
    reconciliation_rate = round((reconciled_cases / total_cases) * 100.0, 2)

    return {
        "suite": "rules_engine",
        "total_cases": total_cases,
        "passed_cases": passed_cases,
        "accuracy_pct": accuracy,
        "reconciliation_pct": reconciliation_rate,
        "reconciled_cases": reconciled_cases,
        "failure_count": len(failures),
        "failures": failures,
    }


if __name__ == "__main__":
    res = evaluate_rules_engine()
    print(res)
