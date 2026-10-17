"""Document upload, validation, storage, and retrieval service for Virasat.

Enforces:
- File validation: PDF, PNG, JPG only via magic bytes. Disguised executables (MZ) rejected.
- Size limit: max 10 MB.
- Count limit: max 25 documents per case.
- Storage path: cases/{case_id}/docs/{doc_id}.
- Short-lived signed URLs via IAM signBlob, fallback to streaming proxy.
- Background asynchronous classification and extraction via Gemini Flash.
- PATCH corrections: each manual edit sets field confidence = 1.0 (human verified),
  writes ChangeLog and AuditLog, bumps Cases.data_version.
"""

import logging
import re
import time
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any

from google.cloud import storage

from app.config import get_settings
from app.db.repositories import CasesRepo, DocumentRepo, PersonRepo
from app.deps import get_storage_client
from app.engines.extract import ExtractionEngine
from app.errors import BadRequest, Forbidden, NotFound
from app.services.timing import record_gcs_call

logger = logging.getLogger(__name__)

SEED_DOCS_DIR = Path(__file__).resolve().parent.parent / "seed" / "docs"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_DOCS_PER_CASE = 25


def validate_file_bytes(data: bytes, filename: str) -> str:
    """Validate file size and magic bytes.

    Accepts:
    - PDF: starts with b"%PDF"
    - PNG: starts with b"\x89PNG\r\n\x1a\n"
    - JPG/JPEG: starts with b"\xff\xd8\xff"

    Rejects .exe renamed .pdf (which starts with b"MZ") or any other unapproved file.
    """
    if len(data) > MAX_FILE_SIZE:
        raise BadRequest(f"File size ({len(data)} bytes) exceeds the maximum limit of 10 MB.")

    if len(data) < 4:
        raise BadRequest("File is empty or corrupted.")

    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    raise BadRequest("Unsupported file type. Only PDF, PNG, and JPG files are accepted.")


def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filename, stripping directory traversal characters and special symbols."""
    base = Path(filename.replace("\\", "/")).name
    clean = re.sub(r'[\x00/\\:\*\?"<>\|]+', '_', base)
    clean = re.sub(r'\.\.+', '.', clean)
    clean = clean.strip('. ')
    return clean[:128] if clean else "uploaded_document.pdf"


def get_document_access_url(case_id: str, doc_id: str, gcs_uri: str) -> str:
    """Return short-lived signed URL (10 min) or streaming proxy URL if signing unavailable."""
    settings = get_settings()
    bucket_name = settings.GCS_BUCKET
    blob_name = f"cases/{case_id}/docs/{doc_id}"

    try:
        client = get_storage_client(settings)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        # Signed URL strictly expires in 10 minutes
        t0 = time.perf_counter()
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=10),
            method="GET",
        )
        record_gcs_call("sign_url", (time.perf_counter() - t0) * 1000.0, blob_name)
        return signed_url
    except Exception as e:
        logger.debug(f"Signed URL generation unavailable locally ({e}), falling back to streaming proxy.")
        return f"/api/documents/{doc_id}/download"


def verify_case_access(case_id: str, uid: str, allow_read_seed: bool = True) -> dict[str, Any]:
    """Verify that case exists and user has permission to access it."""
    case = CasesRepo.get(case_id)
    if not case:
        raise NotFound(f"Case '{case_id}' not found.")

    is_seed = case.get("owner_uid") == "SEED"
    if is_seed and not allow_read_seed:
        raise Forbidden("Seed template cases are read-only.")

    # Strictly enforce case ownership
    if not is_seed and case["owner_uid"] != uid and uid != "system":
        raise Forbidden(f"Case '{case_id}' does not belong to user '{uid}'.")

    return case


class DocumentService:
    def __init__(self, extraction_engine: ExtractionEngine | None = None):
        self.settings = get_settings()
        self.engine = extraction_engine or ExtractionEngine()

    def upload_document(
        self,
        case_id: str,
        file_bytes: bytes,
        filename: str,
        uid: str,
    ) -> dict[str, Any]:
        """Validate, store to GCS, and create Document row with status PENDING."""
        # 0. Sanitize filename and validate case_id to prevent path traversal
        clean_name = sanitize_filename(filename)
        if "/" in case_id or "\\" in case_id or ".." in case_id:
            raise BadRequest("Invalid case identifier format")

        # 1. Validate magic bytes and size
        mime_type = validate_file_bytes(file_bytes, clean_name)

        # 2. Check case ownership and read-only status
        verify_case_access(case_id, uid, allow_read_seed=False)

        # 3. Check document limit (max 25)
        current_count = DocumentRepo.count_by_case(case_id)
        if current_count >= MAX_DOCS_PER_CASE:
            raise BadRequest(f"Maximum limit of {MAX_DOCS_PER_CASE} documents per case reached.")

        # 4. Generate doc_id and storage path: cases/{case_id}/docs/{doc_id}
        doc_id = f"doc-{uuid.uuid4().hex[:12]}"
        blob_path = f"cases/{case_id}/docs/{doc_id}"
        gcs_uri = f"gs://{self.settings.GCS_BUCKET}/{blob_path}"

        # 5. Upload to GCS
        try:
            client = get_storage_client(self.settings)
            bucket = client.bucket(self.settings.GCS_BUCKET)
            blob = bucket.blob(blob_path)
            t0 = time.perf_counter()
            blob.upload_from_string(file_bytes, content_type=mime_type)
            record_gcs_call("upload", (time.perf_counter() - t0) * 1000.0, blob_path)
        except Exception as e:
            logger.warning(f"Could not upload blob to GCS ({e}); proceeding with record creation.")

        # 6. Create Document record in Spanner (status PENDING)
        doc_data = {
            "doc_id": doc_id,
            "case_id": case_id,
            "gcs_uri": gcs_uri,
            "original_name": clean_name,
            "doc_type": None,
            "extracted": {},
            "field_confidence": {},
            "status": "PENDING",
            "verified": False,
            "degraded": False,
        }
        created = DocumentRepo.create(doc_data, actor=uid)

        # 7. Generate access URL
        access_url = get_document_access_url(case_id, doc_id, gcs_uri)
        return self._format_doc_response(created, access_url)

    def extract_document_sync(
        self,
        case_id: str,
        doc_id: str,
        file_bytes: bytes,
        filename: str,
        uid: str = "system",
    ) -> dict[str, Any]:
        """Execute extraction and save results to database."""
        # Retrieve deceased info from case if present for fuzzy name validation
        case_context: dict[str, Any] = {}
        try:
            people = PersonRepo.list_by_case(case_id)
            for p in people:
                if p.get("role") == "DECEASED":
                    case_context["deceased_name"] = p.get("full_name")
                    case_context["dod"] = str(p.get("dod")) if p.get("dod") else None
                    break
        except Exception as e:
            logger.warning(f"Could not load deceased context for case {case_id}: {e}")

        # Execute extraction engine
        extraction_result = self.engine.process_document(file_bytes, filename, case_context)

        # Update document in Spanner
        updates = {
            "doc_type": extraction_result["doc_type"],
            "extracted": extraction_result["extracted"],
            "field_confidence": extraction_result["field_confidence"],
            "status": extraction_result["status"],
            "verified": extraction_result["verified"],
            "degraded": extraction_result["degraded"],
        }
        updated_doc, _ = DocumentRepo.update(case_id, doc_id, updates, actor=uid)
        access_url = get_document_access_url(case_id, doc_id, updated_doc.get("gcs_uri", ""))
        return self._format_doc_response(updated_doc, access_url)

    def list_documents(self, case_id: str, uid: str) -> list[dict[str, Any]]:
        """List active documents for a case."""
        verify_case_access(case_id, uid, allow_read_seed=True)
        docs = DocumentRepo.list_by_case(case_id)
        result = []
        for d in docs:
            url = get_document_access_url(case_id, d["doc_id"], d["gcs_uri"])
            result.append(self._format_doc_response(d, url))
        return result

    def get_document(self, doc_id: str, uid: str) -> dict[str, Any]:
        """Get a document by its doc_id."""
        doc = DocumentRepo.get(doc_id)
        if not doc or doc.get("deleted"):
            raise NotFound(f"Document '{doc_id}' not found.")

        verify_case_access(doc["case_id"], uid, allow_read_seed=True)
        url = get_document_access_url(doc["case_id"], doc_id, doc["gcs_uri"])
        return self._format_doc_response(doc, url)

    def patch_document(
        self,
        doc_id: str,
        payload: dict[str, Any],
        uid: str,
    ) -> dict[str, Any]:
        """Apply manual corrections to extracted document fields.

        Each manual edit:
        - Updates the field in Document.extracted
        - Sets that field's confidence = 1.0 (human verified)
        - Writes ChangeLog and AuditLog
        - Bumps Cases.data_version
        """
        doc = DocumentRepo.get(doc_id)
        if not doc or doc.get("deleted"):
            raise NotFound(f"Document '{doc_id}' not found.")

        case_id = doc["case_id"]
        verify_case_access(case_id, uid, allow_read_seed=False)

        current_extracted = dict(doc.get("extracted") or {})
        current_confidence = dict(doc.get("field_confidence") or {})

        # Extract corrections: payload can pass {"extracted": {...}} or flat fields
        corrections: dict[str, Any] = {}
        if "extracted" in payload and isinstance(payload["extracted"], dict):
            corrections = payload["extracted"]
        else:
            excluded = {"doc_type", "status", "verified", "field_confidence"}
            corrections = {k: v for k, v in payload.items() if k not in excluded}

        # Apply corrections and set confidence = 1.0 (human verified)
        for field, new_val in corrections.items():
            current_extracted[field] = new_val
            current_confidence[field] = 1.0

        updates: dict[str, Any] = {
            "extracted": current_extracted,
            "field_confidence": current_confidence,
            "verified": True,  # Manual review sets verified = True
        }
        if "doc_type" in payload and payload["doc_type"]:
            updates["doc_type"] = payload["doc_type"]
        if "status" in payload and payload["status"]:
            updates["status"] = payload["status"]

        updated_doc, _ = DocumentRepo.update(case_id, doc_id, updates, actor=uid)
        url = get_document_access_url(case_id, doc_id, updated_doc.get("gcs_uri", ""))
        return self._format_doc_response(updated_doc, url)

    def soft_delete_document(self, doc_id: str, uid: str) -> None:
        """Soft delete a document from a case."""
        doc = DocumentRepo.get(doc_id)
        if not doc or doc.get("deleted"):
            raise NotFound(f"Document '{doc_id}' not found.")

        case_id = doc["case_id"]
        verify_case_access(case_id, uid, allow_read_seed=False)
        DocumentRepo.soft_delete(case_id, doc_id, actor=uid)

    def get_document_bytes(self, doc_id: str, uid: str) -> tuple[bytes, str, str]:
        """Download document bytes from GCS for streaming proxy."""
        doc = DocumentRepo.get(doc_id)
        if not doc or doc.get("deleted"):
            raise NotFound(f"Document '{doc_id}' not found.")

        verify_case_access(doc["case_id"], uid, allow_read_seed=True)
        filename = doc.get("original_name", f"{doc_id}.pdf")
        ext = filename.lower().split(".")[-1]
        media_type = "application/pdf" if ext == "pdf" else ("image/png" if ext == "png" else "image/jpeg")

        try:
            client = storage.Client()
            bucket = client.bucket(self.settings.GCS_BUCKET)
            blob = bucket.blob(f"cases/{doc['case_id']}/docs/{doc_id}")
            data = blob.download_as_bytes()
            return data, media_type, filename
        except Exception as e:
            logger.warning(f"Could not download blob from GCS: {e}")
            # Fallback: check seed docs if this doc is cloned from seed
            for cat in ("sharma", "mehta"):
                seed_f = SEED_DOCS_DIR / cat / filename
                if seed_f.exists():
                    return seed_f.read_bytes(), media_type, filename
            raise NotFound(f"Document content for '{doc_id}' could not be downloaded from storage.") from e

    def _format_doc_response(self, doc: dict[str, Any], access_url: str) -> dict[str, Any]:
        """Convert raw Document repository dict into DocumentResponse schema."""
        did = doc.get("doc_id", "")
        extracted = doc.get("extracted") or {}
        confidence = doc.get("field_confidence") or {}
        uploaded_at = doc.get("uploaded_at")
        uploaded_str = uploaded_at.isoformat() if hasattr(uploaded_at, "isoformat") else str(uploaded_at or "")

        return {
            "id": did,
            "doc_id": did,
            "case_id": doc.get("case_id", ""),
            "filename": doc.get("original_name", ""),
            "doc_type": doc.get("doc_type"),
            "storage_uri": doc.get("gcs_uri", ""),
            "status": doc.get("status", "PENDING"),
            "extracted_metadata": extracted,
            "extracted": extracted,
            "field_confidence": confidence,
            "verified": bool(doc.get("verified", False)),
            "degraded": bool(doc.get("degraded", False)),
            "download_url": access_url,
            "signed_url": access_url,
            "uploaded_at": uploaded_str,
        }
