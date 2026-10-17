"""IntakeAgent for Virasat Multi-Agent Pipeline.

Duties:
1. Scans and extracts all unextracted case documents (via P7 extraction pipeline / seed cache).
2. Verifies the death certificate against the deceased person (full name, DOD).
3. Updates the deceased person's DOD if missing.
4. Reports missing mandatory documents (e.g. Death Certificate, Legal Heir Proof).
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz

from app.agents.base import BaseAgent
from app.config import get_settings
from app.db.repositories import CasesRepo, DocumentRepo, PersonRepo
from app.engines.extract import ExtractionEngine, parse_iso_date
from app.services.events import EventEmitter

logger = logging.getLogger(__name__)

SEED_DOCS_DIR = Path(__file__).resolve().parent.parent / "seed" / "docs"
SEED_CACHE_DIR = Path(__file__).resolve().parent.parent / "seed" / "cache"


def list_case_documents_tool(case_id: str) -> list[dict[str, Any]]:
    """List all active documents in the case."""
    docs = DocumentRepo.list_by_case(case_id)
    return [
        {
            "doc_id": d["doc_id"],
            "filename": d.get("original_name", ""),
            "doc_type": d.get("doc_type", "UNKNOWN"),
            "status": d.get("status", "PENDING"),
            "extracted": bool(d.get("extracted") and d.get("extracted") != {"seeded": True}),
        }
        for d in docs
    ]


def extract_pending_documents_tool(case_id: str) -> dict[str, Any]:
    """Extract all documents in the case that have no extraction or are pending."""
    docs = DocumentRepo.list_by_case(case_id)
    engine = ExtractionEngine()
    settings = get_settings()

    case = CasesRepo.get(case_id)
    seed_key = case.get("seed_key", "sharma") if case else "sharma"

    extracted_count = 0
    errors = []

    import concurrent.futures

    pending_docs = []
    for d in docs:
        current_ext = d.get("extracted") or {}
        is_pending = (
            d.get("status") == "PENDING"
            or not current_ext
            or current_ext == {"seeded": True}
            or current_ext.get("seeded") is True
        )
        if is_pending:
            pending_docs.append(d)

    def _process_single_doc(d: dict[str, Any]) -> tuple[bool, dict[str, Any] | None]:
        doc_id = d["doc_id"]
        fname = d.get("original_name", "")
        try:
            idx = doc_id.split("-")[-1] if "-" in doc_id else ""
            canonical_seed_stem = f"doc-{seed_key}-{idx}"

            # 1. Check pre-computed cache first
            cache_file = SEED_CACHE_DIR / seed_key / f"{canonical_seed_stem}.json"
            if not cache_file.exists():
                cache_file = SEED_CACHE_DIR / seed_key / f"{Path(fname).stem}.json"

            if cache_file.exists():
                cache_data = json.loads(cache_file.read_text(encoding="utf-8"))
                dt = cache_data.get("doc_type", d.get("doc_type", "OTHER"))
                updates = {
                    "doc_type": dt,
                    "extracted": cache_data,
                    "field_confidence": {k: 0.98 for k in cache_data},
                    "status": "EXTRACTED",
                    "verified": True,
                    "degraded": False,
                    "cached": True,
                }
                DocumentRepo.update(case_id, doc_id, updates, actor="IntakeAgent")
                return True, None

            # 2. Check local seed docs
            seed_doc_path = SEED_DOCS_DIR / seed_key / fname
            if not seed_doc_path.exists():
                matches = list((SEED_DOCS_DIR / seed_key).glob(f"{canonical_seed_stem}.*"))
                if matches:
                    seed_doc_path = matches[0]

            if seed_doc_path.exists():
                raw_bytes = seed_doc_path.read_bytes()
                result = engine.process_document(raw_bytes, fname)
                updates = {
                    "doc_type": result["doc_type"],
                    "extracted": result["extracted"],
                    "field_confidence": result["field_confidence"],
                    "status": result["status"],
                    "verified": result["verified"],
                    "degraded": result["degraded"],
                    "cached": result.get("cached", False),
                }
                DocumentRepo.update(case_id, doc_id, updates, actor="IntakeAgent")
                return True, None
            return False, None
        except Exception as e:
            logger.warning("Could not extract document %s (%s): %s", doc_id, fname, e)
            return False, {"doc_id": doc_id, "error": str(e)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        results = list(executor.map(_process_single_doc, pending_docs))

    for success, err in results:
        if success:
            extracted_count += 1
        elif err:
            errors.append(err)

    return {"extracted_count": extracted_count, "errors": errors}


def verify_death_certificate_tool(case_id: str) -> dict[str, Any]:
    """Verify death certificate against the deceased person and update DOD if missing."""
    docs = DocumentRepo.list_by_case(case_id)
    case = CasesRepo.get(case_id)
    if not case:
        return {"verified": False, "reason": "Case not found"}

    deceased_id = case.get("deceased_person_id")
    deceased = PersonRepo.get(deceased_id) if deceased_id else None

    # Find DEATH_CERT document
    death_doc = None
    for d in docs:
        dtype = str(d.get("doc_type", "")).upper()
        if "DEATH" in dtype or "DEATH_CERT" in dtype or "01" in d.get("original_name", ""):
            death_doc = d
            break

    if not death_doc:
        return {"verified": False, "reason": "Death certificate not found in uploaded documents"}

    extracted = death_doc.get("extracted") or {}
    cert_name = extracted.get("deceased_name", extracted.get("deceased", ""))
    cert_dod_str = extracted.get("dod", extracted.get("date_of_death", ""))

    case_name = deceased.get("full_name", "") if deceased else ""
    name_matched = False
    if cert_name and case_name:
        ratio = fuzz.token_sort_ratio(cert_name.lower(), case_name.lower())
        name_matched = ratio >= 80

    dod_updated = False
    new_dod = None
    if cert_dod_str:
        parsed_dod = parse_iso_date(str(cert_dod_str))
        if parsed_dod:
            new_dod = parsed_dod.date().isoformat()
            if deceased and not deceased.get("dod"):
                PersonRepo.update(case_id, deceased["person_id"], {"dod": parsed_dod.date()}, actor="IntakeAgent")
                dod_updated = True

    return {
        "verified": name_matched,
        "deceased_name_match": name_matched,
        "extracted_name": cert_name,
        "extracted_dod": new_dod,
        "dod_updated": dod_updated,
        "doc_id": death_doc["doc_id"],
    }


def check_mandatory_documents_tool(case_id: str) -> dict[str, Any]:
    """Check for presence of mandatory estate settlement documents."""
    docs = DocumentRepo.list_by_case(case_id)
    doc_types = {str(d.get("doc_type", "")).upper() for d in docs}

    has_death_cert = any("DEATH" in dt for dt in doc_types)
    has_id_proof = any("ID" in dt or "AADHAAR" in dt or "PAN" in dt for dt in doc_types)

    missing = []
    if not has_death_cert:
        missing.append("DEATH_CERTIFICATE")
    if not has_id_proof:
        missing.append("IDENTITY_PROOF_OF_HEIRS")

    return {
        "mandatory_complete": len(missing) == 0,
        "has_death_certificate": has_death_cert,
        "has_id_proof": has_id_proof,
        "missing_mandatory": missing,
    }


class IntakeAgent(BaseAgent):
    """IntakeAgent for extracting and validating case documents."""

    def __init__(self, settings=None):
        instruction = (
            "You are Virasat's IntakeAgent. Your job is to:\n"
            "1. Scan all documents in the case using list_case_documents_tool.\n"
            "2. Extract any pending or unextracted documents using extract_pending_documents_tool.\n"
            "3. Verify the death certificate and update the deceased's DOD if missing using verify_death_certificate_tool.\n"
            "4. Check for missing mandatory documents using check_mandatory_documents_tool.\n"
            "Return a concise summary of the verification status."
        )
        tools = [
            list_case_documents_tool,
            extract_pending_documents_tool,
            verify_death_certificate_tool,
            check_mandatory_documents_tool,
        ]
        super().__init__(
            name="IntakeAgent",
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
        """Execute document intake and verification with tool call events."""
        emitter.emit(
            event_type="agent_started",
            agent=self.name,
            message=f"{self.name} scanning case documents and verifying death certificate...",
        )
        if "invalid" in str(self.model).lower() or "error" in str(self.model).lower():
            logger.warning("Agent %s model %s is invalid, triggering degraded fallback.", self.name, self.model)
            return await self.fallback_execute(case_id, emitter, context)

        try:
            # Tool 1: extract unextracted documents
            emitter.emit(
                event_type="tool_call",
                agent=self.name,
                message="Executing extract_pending_documents_tool",
                payload={"tool": "extract_pending_documents_tool", "case_id": case_id},
            )
            ext_res = extract_pending_documents_tool(case_id)

            # Tool 2: verify death certificate
            emitter.emit(
                event_type="tool_call",
                agent=self.name,
                message="Executing verify_death_certificate_tool",
                payload={"tool": "verify_death_certificate_tool", "case_id": case_id},
            )
            cert_res = verify_death_certificate_tool(case_id)
            if cert_res.get("verified"):
                emitter.emit(
                    event_type="agent_message",
                    agent=self.name,
                    message=f"Verified death certificate for deceased {cert_res.get('extracted_name')} (DOD: {cert_res.get('extracted_dod')}).",
                )

            # Tool 3: check mandatory documents
            emitter.emit(
                event_type="tool_call",
                agent=self.name,
                message="Executing check_mandatory_documents_tool",
                payload={"tool": "check_mandatory_documents_tool", "case_id": case_id},
            )
            mand_res = check_mandatory_documents_tool(case_id)
            if mand_res.get("mandatory_complete"):
                emitter.emit(
                    event_type="agent_message",
                    agent=self.name,
                    message="All mandatory documents (Death Certificate, Identity Proof) verified present.",
                )

            emitter.emit(
                event_type="agent_done",
                agent=self.name,
                message=f"{self.name} completed document intake and verification.",
            )
            return {
                "status": "success",
                "agent": self.name,
                "extract": ext_res,
                "death_cert": cert_res,
                "mandatory": mand_res,
            }
        except Exception as e:
            logger.error("IntakeAgent error: %s", e)
            return await self.fallback_execute(case_id, emitter, context)

    async def fallback_execute(
        self,
        case_id: str,
        emitter: EventEmitter,
        context: dict[str, Any] | None = None,
    ) -> Any:
        """Deterministic fallback executing all intake tools without model calls."""
        emitter.emit(
            event_type="agent_message",
            agent=self.name,
            message="Executing deterministic document intake and verification...",
            degraded=True,
        )
        extract_res = extract_pending_documents_tool(case_id)
        verify_res = verify_death_certificate_tool(case_id)
        mand_res = check_mandatory_documents_tool(case_id)
        return {
            "extract_result": extract_res,
            "verification_result": verify_res,
            "mandatory_check": mand_res,
        }
