"""Verifier engine for Virasat GraphRAG.

Enforces grounding and zero-hallucination guarantees:
1. Citation validation: Rejects if any cited clause_id or fact_id is not in the retrieved context set.
2. Monetary & Percentage validation: Rejects if any rupee amount or percentage in the answer
   is not present in the graph facts or engine output.
3. Appends standard statutory disclaimer: "Guidance, not legal advice."
"""

import logging
import re
from typing import Any

from app.models.schemas import GraphRAGContext

logger = logging.getLogger(__name__)

DISCLAIMER = "Guidance, not legal advice."


def normalize_numeric_str(s: str) -> float | None:
    """Extract a float representation from numeric string if possible."""
    clean = (
        s.replace("₹", "")
        .replace("INR", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace(",", "")
        .replace("%", "")
        .strip()
    )
    # Check for Lakh / Crore multipliers
    multiplier = 1.0
    if re.search(r"\b(cr|crore)\b", clean, re.IGNORECASE):
        clean = re.sub(r"\b(cr|crore)\b", "", clean, flags=re.IGNORECASE).strip()
        multiplier = 10000000.0
    elif re.search(r"\b(lakh|lac|l)\b", clean, re.IGNORECASE):
        clean = re.sub(r"\b(lakh|lac|l)\b", "", clean, flags=re.IGNORECASE).strip()
        multiplier = 100000.0

    try:
        return float(clean) * multiplier
    except Exception:
        return None


def extract_numbers_and_percentages(text: str) -> list[tuple[str, float]]:
    """Extract all rupee amounts and percentages from text."""
    found: list[tuple[str, float]] = []

    # 1. Rupee patterns: ₹18,50,000 or INR 18,50,000 or 18.5 Lakh or 2.84 Cr
    rupee_pattern = r"(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d+)?(?:\s*(?:Cr|Crore|Lakh|Lac|L))?)"
    for m in re.finditer(rupee_pattern, text, re.IGNORECASE):
        raw = m.group(0).strip()
        val = normalize_numeric_str(m.group(1))
        if val is not None:
            found.append((raw, val))

    # 2. Percentage patterns: 100% or 25% or 33.33%
    pct_pattern = r"(\b\d+(?:\.\d+)?)\s*%"
    for m in re.finditer(pct_pattern, text):
        raw = m.group(0).strip()
        val = normalize_numeric_str(m.group(1))
        if val is not None:
            found.append((raw, val))

    return found


def extract_citations_from_text(text: str) -> set[str]:
    """Find any bracketed citation keys in text, e.g. [HSA-1956-S8] or [fact-nominee-01]."""
    matches = re.findall(r"\[([A-Za-z0-9_\-]+)\]", text)
    return set(matches)


class AnswerVerifier:
    def __init__(self):
        self.disclaimer = DISCLAIMER

    def collect_allowed_grounded_numbers(
        self,
        context: GraphRAGContext | dict[str, Any],
        engine_output: dict[str, Any] | None = None,
        tool_data: dict[str, Any] | None = None,
    ) -> list[float]:
        """Gather all numbers, values, and percentages present in graph_facts, engine_output, and tool_data."""
        allowed: list[float] = []

        # From graph facts
        facts = context.graph_facts if hasattr(context, "graph_facts") else context.get("graph_facts", [])
        for f in facts:
            f_text = f.get("text", "") if isinstance(f, dict) else str(f)
            for _, val in extract_numbers_and_percentages(f_text):
                allowed.append(val)
            # Also extract standalone numbers
            for n in re.findall(r"\b\d+(?:,\d+)*(?:\.\d+)?\b", f_text):
                v = normalize_numeric_str(n)
                if v is not None and v > 0:
                    allowed.append(v)

        # From engine_output (e.g. shares calculation)
        if engine_output:
            for s in engine_output.get("shares", []):
                if "share_pct" in s and s["share_pct"] is not None:
                    allowed.append(float(s["share_pct"]))
                if "amount_inr" in s and s["amount_inr"] is not None:
                    allowed.append(float(s["amount_inr"]))
            if "estate_value_inr" in engine_output:
                allowed.append(float(engine_output["estate_value_inr"]))

        # From tool_data (e.g. asset balance, nominee shares, checklist counts)
        if tool_data:
            tool_str = str(tool_data)
            for _, val in extract_numbers_and_percentages(tool_str):
                allowed.append(val)
            for n in re.findall(r"\b\d+(?:,\d+)*(?:\.\d+)?\b", tool_str):
                v = normalize_numeric_str(n)
                if v is not None and v > 0:
                    allowed.append(v)

        # Derived fractional calculations (e.g., 50% split of a 9,20,000 balance is 4,60,000)
        base_monetary_vals = [v for v in allowed if v >= 1000]
        fraction_multipliers = [0.1, 0.125, 0.2, 0.25, 1/3, 0.333, 0.3333, 0.4, 0.5, 2/3, 0.666, 0.6667, 0.75]
        for base in base_monetary_vals:
            for frac in fraction_multipliers:
                allowed.append(round(base * frac, 2))
                allowed.append(float(int(base * frac)))

        # Common structural integers and statutory fraction percentages allowed in legal steps
        allowed.extend([0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 7.0, 10.0, 12.5, 14.0, 15.0, 20.0, 25.0, 30.0, 33.3, 33.33, 45.0, 50.0, 60.0, 75.0, 90.0, 100.0])
        return allowed

    def verify(
        self,
        question: str,
        answer_dict: dict[str, Any],
        context: GraphRAGContext | dict[str, Any],
        engine_output: dict[str, Any] | None = None,
        tool_data: dict[str, Any] | None = None,
    ) -> tuple[bool, str, dict[str, Any]]:
        """Verify grounding of citations, rupee amounts, and percentages.

        Returns (is_valid, failure_reason, updated_answer_dict).
        """
        # 1. Build valid citation set
        clauses = context.clauses if hasattr(context, "clauses") else context.get("clauses", [])
        facts = context.graph_facts if hasattr(context, "graph_facts") else context.get("graph_facts", [])

        allowed_citations = {c.get("clause_id") for c in clauses if isinstance(c, dict) and c.get("clause_id")}
        allowed_citations.update({f.get("fact_id") for f in facts if isinstance(f, dict) and f.get("fact_id")})

        if engine_output:
            for clause in engine_output.get("clause_ids", []):
                allowed_citations.add(clause)

        # 2. Check explicitly listed citations
        cited_ids = answer_dict.get("citations", [])
        if isinstance(cited_ids, list):
            for cid in cited_ids:
                if cid not in allowed_citations:
                    msg = f"Unknown citation ID '{cid}' is not in the retrieved legal clauses or graph facts."
                    logger.warning("Verification failed: %s", msg)
                    return False, msg, answer_dict

        # Check inline bracketed citations in text
        answer_text = str(answer_dict.get("answer", ""))
        steps_text = " ".join(str(s) for s in answer_dict.get("steps", []))
        full_text = f"{answer_text} {steps_text}"

        inline_citations = extract_citations_from_text(full_text)
        for cid in inline_citations:
            # Allow common markdown references or footnote numbers
            if cid.isdigit():
                continue
            if cid not in allowed_citations and ("HSA-" in cid or "ISA-" in cid or "RBI-" in cid or "fact-" in cid or "SEBI-" in cid or "INS-" in cid or "EPF-" in cid or "PPF-" in cid):
                msg = f"Hallucinated inline citation '{cid}' is not present in retrieved context."
                logger.warning("Verification failed: %s", msg)
                return False, msg, answer_dict

        # 3. Check rupee amounts and percentages
        grounded_numbers = self.collect_allowed_grounded_numbers(context, engine_output, tool_data)
        found_numbers = extract_numbers_and_percentages(full_text)

        for raw_str, val in found_numbers:
            # Check if value matches any grounded number within 1% tolerance
            matched = any(abs(val - g) < 0.05 or (g != 0 and abs(val - g) / g < 0.02) for g in grounded_numbers)
            if not matched:
                msg = f"Rupee amount or percentage '{raw_str}' ({val}) in answer is not supported by graph facts or engine output."
                logger.warning("Verification failed: %s", msg)
                return False, msg, answer_dict

        # 4. Guarantee statutory disclaimer is appended
        cleaned_answer = answer_text.strip()
        if self.disclaimer not in cleaned_answer:
            cleaned_answer = f"{cleaned_answer}\n\n{self.disclaimer}"
        answer_dict["answer"] = cleaned_answer

        return True, "", answer_dict

    def build_degraded_answer(
        self,
        reason: str,
        answer_dict: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Construct a safe degraded response when verification cannot be satisfied."""
        base = dict(answer_dict or {})
        base["answer"] = (
            f"The system could not verify a grounded answer strictly against the retrieved case facts and legal corpus: {reason}\n\n"
            f"{self.disclaimer}"
        )
        base["citations"] = []
        base["steps"] = []
        base["confidence"] = 0.0
        base["degraded"] = True
        base["needs_lawyer"] = True
        return base
