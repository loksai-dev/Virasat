"""Verification script for P7: runs every seed document through ExtractionEngine
and measures doc_type accuracy and field accuracy against ground truth seed cache.
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rapidfuzz import fuzz

from app.config import get_settings
from app.engines.extract import ExtractionEngine, CATEGORY_ALIASES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_p7")

SEED_DOCS_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "docs"
SEED_CACHE_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "cache"


from app.engines.extract import parse_iso_date


def match_field_value(extracted_val: Any, cache_val: Any) -> bool:
    """Compare extracted field value with ground truth cache value."""
    # Check if both denote absence of value
    s_ext = str(extracted_val).strip().upper() if extracted_val is not None else ""
    s_cac = str(cache_val).strip().upper() if cache_val is not None else ""
    if s_ext in ("", "NONE", "NULL", "N/A", "NOT APPLICABLE") and s_cac in ("", "NONE", "NULL", "N/A", "NOT APPLICABLE"):
        return True

    if extracted_val is None or cache_val is None:
        return extracted_val == cache_val

    # Boolean comparison (e.g. witnesses: false)
    if isinstance(cache_val, bool):
        if isinstance(extracted_val, bool):
            return extracted_val == cache_val
        s = str(extracted_val).strip().lower()
        if cache_val is False:
            return any(w in s for w in ("false", "no", "none", "blank", "incomplete", "unregistered", "missing", "unattested", "unsigned"))
        return any(w in s for w in ("true", "yes", "signed", "attested", "present", "registered", "valid"))

    # Dict comparison (e.g. bequests or inconsistencies)
    if isinstance(cache_val, dict):
        if not isinstance(extracted_val, dict):
            # If extracted is string representation of dict or bequests
            s_ext_str = str(extracted_val).lower()
            return all(k.lower() in s_ext_str for k in cache_val.keys())
        matches = 0
        total = len(cache_val)
        for k, v in cache_val.items():
            if k in extracted_val and match_field_value(extracted_val[k], v):
                matches += 1
        return (matches / total) >= 0.70 if total > 0 else True

    # Date comparison
    d1 = parse_iso_date(str(extracted_val))
    d2 = parse_iso_date(str(cache_val))
    if d1 and d2:
        return d1.date() == d2.date()

    # Numeric comparison
    try:
        n1 = float(str(extracted_val).replace(",", "").replace("INR", "").replace("₹", "").replace("…", "").strip())
        n2 = float(str(cache_val).replace(",", "").replace("INR", "").replace("₹", "").replace("…", "").strip())
        return abs(n1 - n2) < 0.01 or (n2 != 0 and abs(n1 - n2) / abs(n2) < 0.05)
    except Exception:
        pass

    s1 = str(extracted_val).strip().lower()
    s2 = str(cache_val).strip().lower()

    # Normalize last 4
    if len(s1) >= 4 and len(s2) >= 4 and (s1.endswith(s2[-4:]) or s2.endswith(s1[-4:])):
        return True

    # Fuzzy string comparison
    ratio = fuzz.token_sort_ratio(s1, s2)
    return ratio >= 75



async def evaluate_single_doc(engine: ExtractionEngine, file_path: Path, doc_id: str, cache_data: dict[str, Any]):
    raw_bytes = file_path.read_bytes()
    expected_doc_type = CATEGORY_ALIASES.get(cache_data.get("doc_type", ""), cache_data.get("doc_type", ""))

    case_context = {
        "deceased_name": "Ramesh Sharma" if "sharma" in file_path.parent.name else "Anil Mehta",
        "dod": "2026-03-14" if "sharma" in file_path.parent.name else "2026-05-22",
    }

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, engine.process_document, raw_bytes, file_path.name, case_context)

    extracted_type = CATEGORY_ALIASES.get(result["doc_type"], result["doc_type"])
    type_matched = (extracted_type == expected_doc_type)
    if not type_matched:
        logger.warning(f"[{doc_id}] Doc type mismatch: expected={expected_doc_type}, got={extracted_type}")

    # Compare fields
    extracted_fields = result.get("extracted", {})
    field_matches = 0
    total_fields = 0

    for k, expected_v in cache_data.items():
        if k == "doc_type":
            continue
        total_fields += 1
        extracted_v = extracted_fields.get(k)
        if match_field_value(extracted_v, expected_v):
            field_matches += 1
        else:
            logger.warning(f"[{doc_id}] Field mismatch on '{k}': expected={expected_v}, got={extracted_v}")

    return {
        "doc_id": doc_id,
        "type_matched": type_matched,
        "expected_type": expected_doc_type,
        "extracted_type": extracted_type,
        "field_matches": field_matches,
        "total_fields": total_fields,
        "extracted": extracted_fields,
    }


async def main():
    engine = ExtractionEngine()
    tasks = []

    # Gather all 31 documents
    for scenario in ("sharma", "mehta"):
        d = SEED_DOCS_DIR / scenario
        for f in sorted(d.iterdir()):
            if f.is_file():
                doc_id = f.stem
                cache_file = SEED_CACHE_DIR / scenario / f"{doc_id}.json"
                if not cache_file.exists():
                    cache_file = SEED_CACHE_DIR / f"{doc_id}.json"
                with open(cache_file, encoding="utf-8") as fp:
                    cache_data = json.load(fp)
                tasks.append(evaluate_single_doc(engine, f, doc_id, cache_data))

    print(f"Running extraction on {len(tasks)} documents...")
    # Run sequentially with 1.0s pause to stay well within 60 RPM Vertex AI limits
    sem = asyncio.Semaphore(1)

    async def run_with_sem(task_coro):
        async with sem:
            res = await task_coro
            await asyncio.sleep(1.0)
            return res

    results = await asyncio.gather(*(run_with_sem(t) for t in tasks))

    total_docs = len(results)
    type_correct = sum(1 for r in results if r["type_matched"])
    total_fields = sum(r["total_fields"] for r in results)
    fields_correct = sum(r["field_matches"] for r in results)

    doc_type_accuracy = (type_correct / total_docs) * 100.0
    field_accuracy = (fields_correct / total_fields) * 100.0

    print("\n" + "=" * 60)
    print("EXTRACTION BENCHMARK RESULTS ACROSS SEED DOCUMENTS")
    print("=" * 60)
    print(f"Total Documents:       {total_docs}")
    print(f"Correct Doc Types:     {type_correct}/{total_docs} ({doc_type_accuracy:.1f}%)")
    print(f"Total Evaluated Fields:{total_fields}")
    print(f"Correct Fields:        {fields_correct}/{total_fields} ({field_accuracy:.1f}%)")
    print("=" * 60)

    # Check Vikram's affidavit specifics
    affidavit_res = next((r for r in results if r["doc_id"] == "doc-sharma-18"), None)
    if affidavit_res:
        ext = affidavit_res["extracted"]
        print("\nVIKRAM'S AFFIDAVIT (doc-sharma-18) PLANTED INCONSISTENCIES:")
        print(f"  Deceased Name:  '{ext.get('deceased_name_as_written')}'")
        print(f"  Date of Death:  '{ext.get('date_of_death_as_written')}'")
        print(f"  Notary Date:    '{ext.get('notary_date')}'")
        print(f"  Inconsistencies:{ext.get('inconsistencies')}")

    return doc_type_accuracy, field_accuracy


if __name__ == "__main__":
    asyncio.run(main())
