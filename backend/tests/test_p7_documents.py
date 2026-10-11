"""Tests for P7: Document upload, magic byte validation, and real extraction.

Verifies:
1. Rejection of .exe disguised as .pdf (magic bytes check)
2. Max document size (10 MB) and max document count (25 per case)
3. Deliberately blurred image returns lower confidence
4. Model failure falls back to seed cache with degraded=True; unknown files get NEEDS_REVIEW
5. Vikram's affidavit extracts planted inconsistencies exactly as written and sets verified=False
6. PATCH /documents/{id} sets field confidence = 1.0 (human verified) and logs audit trail
7. Seed extraction accuracy across documents meets >= 90% threshold
"""

import io
import json
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image, ImageFilter

from app.engines.extract import (
    CATEGORY_ALIASES,
    ExtractionEngine,
    compute_image_blur_penalty,
)
from app.errors import BadRequest
from app.main import app
from app.services.documents import DocumentService, validate_file_bytes
from app.services.sessions import clone_seed
from scripts.verify_p7_live import match_field_value

SEED_DOCS_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "docs"
SEED_CACHE_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "cache"


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def test_magic_bytes_detection():
    """Verify validate_file_bytes recognizes valid types and raises BadRequest for invalid types."""
    # Valid PDF
    assert validate_file_bytes(b"%PDF-1.4\n...", "doc.pdf") == "application/pdf"
    # Valid PNG
    assert validate_file_bytes(b"\x89PNG\r\n\x1a\n\x00\x00", "doc.png") == "image/png"
    # Valid JPEG
    assert validate_file_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF", "doc.jpg") == "image/jpeg"

    # Windows .EXE (MZ header)
    with pytest.raises(BadRequest):
        validate_file_bytes(b"MZ\x90\x00\x03\x00\x00\x00", "malicious.pdf")

    # Plain text / script
    with pytest.raises(BadRequest):
        validate_file_bytes(b"import os; print('malicious')", "script.py")

    # ZIP archive (PK header)
    with pytest.raises(BadRequest):
        validate_file_bytes(b"PK\x03\x04\x14\x00", "archive.zip")


@pytest.mark.asyncio
async def test_magic_bytes_rejects_disguised_exe(async_client: AsyncClient):
    """A .exe file renamed to malicious.pdf must be rejected with 400 Bad Request."""
    uid = "test-user-p7-exe"
    case_id = clone_seed("sharma", uid, mode="empty")
    headers = {"Authorization": f"Bearer {uid}"}

    # Fake PE executable header disguised as .pdf
    fake_exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is a Windows executable!"

    files = {
        "file": ("malicious_executable.pdf", fake_exe_bytes, "application/pdf")
    }
    res = await async_client.post(f"/api/cases/{case_id}/documents", files=files, headers=headers)
    assert res.status_code == 400
    error_msg = res.json().get("error", {}).get("message", "")
    assert "Unsupported file type" in error_msg


@pytest.mark.asyncio
async def test_document_size_limit(async_client: AsyncClient):
    """Files exceeding 10 MB must be rejected with 400 Bad Request."""
    uid = "test-user-p7-size"
    case_id = clone_seed("sharma", uid, mode="empty")
    headers = {"Authorization": f"Bearer {uid}"}

    # 11 MB of fake PDF data starting with %PDF-
    oversized_data = b"%PDF-1.4 " + (b"0" * (11 * 1024 * 1024))

    files = {
        "file": ("oversized.pdf", oversized_data, "application/pdf")
    }
    res = await async_client.post(f"/api/cases/{case_id}/documents", files=files, headers=headers)
    assert res.status_code == 400
    error_msg = res.json().get("error", {}).get("message", "")
    assert "exceeds the maximum limit" in error_msg


@pytest.mark.asyncio
async def test_document_count_limit():
    """Cases cannot exceed 25 documents."""
    service = DocumentService()
    with (
        patch("app.services.documents.verify_case_access"),
        patch("app.services.documents.DocumentRepo.count_by_case", return_value=25),
    ):
        valid_pdf = b"%PDF-1.4\nsome pdf content"
        with pytest.raises(BadRequest) as exc_info:
            service.upload_document(
                case_id="case-test-max",
                filename="doc26.pdf",
                file_bytes=valid_pdf,
                uid="user-1",
            )
        assert "Maximum limit of 25 documents" in str(exc_info.value)


# ===========================================================================
# 2. DELIBERATELY BLURRED IMAGE RETURNS LOWER CONFIDENCE
# ===========================================================================
def test_blurred_image_returns_lower_confidence():
    """Verify that a blurred image yields a significant blur penalty, reducing confidence."""
    # Use real scanned image from seed docs
    sharp_path = SEED_DOCS_DIR / "sharma" / "doc-sharma-02.png"
    sharp_bytes = sharp_path.read_bytes()

    # Create heavily blurred version of same image
    sharp_img = Image.open(io.BytesIO(sharp_bytes))
    blurred_img = sharp_img.filter(ImageFilter.GaussianBlur(radius=15))
    blurred_buf = io.BytesIO()
    blurred_img.save(blurred_buf, format="PNG")
    blurred_bytes = blurred_buf.getvalue()

    mult_sharp = compute_image_blur_penalty(sharp_bytes, "image/png")
    mult_blurred = compute_image_blur_penalty(blurred_bytes, "image/png")

    # Sharp image has 1.0 multiplier, blurred image receives penalty (< 1.0)
    assert mult_sharp == 1.0
    assert mult_blurred < 0.80


# ===========================================================================
# 3. FALLBACK TO CACHE ON MODEL FAILURE
# ===========================================================================
def test_cache_fallback_on_model_failure():
    """When the model call fails, engine falls back to matching seed cache with degraded=True."""
    engine = ExtractionEngine()

    # Use a real seed doc (doc-sharma-01.pdf)
    seed_pdf_path = SEED_DOCS_DIR / "sharma" / "doc-sharma-01.pdf"
    raw_bytes = seed_pdf_path.read_bytes()

    # Force model call to fail
    with patch.object(engine, "_call_gemini_with_retry", side_effect=RuntimeError("Vertex AI unavailable")):
        result = engine.process_document(raw_bytes, "doc-sharma-01.pdf")

        assert result["degraded"] is True
        assert result["status"] == "EXTRACTED"
        assert result["doc_type"] in ("DEATH_CERT", "DEATH_CERTIFICATE")
        assert result["extracted"]["deceased"] == "Ramesh Sharma"


def test_unknown_document_failure_sets_needs_review():
    """When model fails on a user-uploaded document with no cache, status is NEEDS_REVIEW."""
    engine = ExtractionEngine()
    arbitrary_pdf = b"%PDF-1.4\nRandom user document that has no seed cache entry."

    with patch.object(engine, "_call_gemini_with_retry", side_effect=RuntimeError("Vertex AI unavailable")):
        result = engine.process_document(arbitrary_pdf, "unknown_user_doc.pdf")

        assert result["status"] == "NEEDS_REVIEW"
        assert result["degraded"] is True
        assert result["extracted"] == {}


# ===========================================================================
# 4. VIKRAM'S AFFIDAVIT PLANTED INCONSISTENCIES
# ===========================================================================
def test_vikram_affidavit_planted_inconsistencies():
    """Vikram's affidavit (doc-sharma-18.pdf) must extract planted typo, wrong DOD, and early notary date."""
    engine = ExtractionEngine()
    affidavit_path = SEED_DOCS_DIR / "sharma" / "doc-sharma-18.pdf"
    raw_bytes = affidavit_path.read_bytes()

    case_context = {
        "deceased_name": "Ramesh Sharma",
        "dod": "2026-03-14",
    }

    result = engine.process_document(raw_bytes, "doc-sharma-18.pdf", case_context=case_context)
    ext = result["extracted"]

    assert result["doc_type"] == "AFFIDAVIT"
    # Planted inconsistencies exactly as written
    assert ext.get("deceased_name_as_written") == "Rameshh Sharma"
    assert "19" in str(ext.get("date_of_death_as_written"))
    assert "10" in str(ext.get("notary_date"))

    # Notary date prior to DOD must invalidate verification
    assert result["verified"] is False
    assert result["field_confidence"].get("notary_date", 1.0) <= 0.50


# ===========================================================================
# 5. PATCH /documents/{id} SETS CONFIDENCE 1.0 & AUDIT
# ===========================================================================
@pytest.mark.asyncio
async def test_patch_document_human_verified(async_client: AsyncClient):
    """Manual correction via PATCH /documents/{id} sets confidence to 1.0 and logs audit."""
    uid = "test-user-p7-patch"
    case_id = clone_seed("sharma", uid, mode="empty")
    headers = {"Authorization": f"Bearer {uid}"}

    # Upload valid PDF
    pdf_bytes = (SEED_DOCS_DIR / "sharma" / "doc-sharma-01.pdf").read_bytes()
    upload_res = await async_client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("death_cert.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 202
    doc_id = upload_res.json()["doc_id"]

    # Retrieve initial document
    get_res = await async_client.get(f"/api/documents/{doc_id}", headers=headers)
    assert get_res.status_code == 200

    # User manually corrects deceased name and DOD
    patch_payload = {
        "extracted": {
            "deceased_name": "Ramesh Chandra Sharma",
            "date_of_death": "2026-03-14",
        }
    }
    patch_res = await async_client.patch(
        f"/api/documents/{doc_id}",
        json=patch_payload,
        headers=headers,
    )
    assert patch_res.status_code == 200
    patched_doc = patch_res.json()

    # Corrected fields must have confidence 1.0 (human verified)
    assert patched_doc["field_confidence"]["deceased_name"] == 1.0
    assert patched_doc["field_confidence"]["date_of_death"] == 1.0

    # Audit log check
    audit_res = await async_client.get(f"/api/cases/{case_id}/audit", headers=headers)
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()
    assert any(
        a.get("action") == "document_updated" and (doc_id in str(a.get("payload", "")))
        for a in audit_entries
    )


# ===========================================================================
# 6. SEED DOCUMENT EXTRACTION ACCURACY BENCHMARK
# ===========================================================================
def test_seed_documents_benchmark_accuracy():
    """Verify that seed documents achieve 100% doc_type and >= 90% field accuracy against ground truth."""
    engine = ExtractionEngine()
    sample_docs = [
        ("sharma", "doc-sharma-01", "Ramesh Sharma", "2026-03-14"),
        ("sharma", "doc-sharma-05", "Ramesh Sharma", "2026-03-14"),
        ("sharma", "doc-sharma-08", "Ramesh Sharma", "2026-03-14"),
        ("sharma", "doc-sharma-12", "Ramesh Sharma", "2026-03-14"),
        ("sharma", "doc-sharma-18", "Ramesh Sharma", "2026-03-14"),
        ("mehta", "doc-mehta-01", "Anil Mehta", "2026-05-22"),
        ("mehta", "doc-mehta-05", "Anil Mehta", "2026-05-22"),
        ("mehta", "doc-mehta-12", "Anil Mehta", "2026-05-22"),
    ]

    doc_type_matches = 0
    total_fields = 0
    field_matches = 0

    for scenario, doc_id, dec_name, dod in sample_docs:
        # Load doc
        for ext in (".pdf", ".png", ".jpg"):
            fpath = SEED_DOCS_DIR / scenario / f"{doc_id}{ext}"
            if fpath.exists():
                break

        cache_path = SEED_CACHE_DIR / scenario / f"{doc_id}.json"
        with open(cache_path, encoding="utf-8") as fp:
            cache_data = json.load(fp)

        res = engine.process_document(
            fpath.read_bytes(),
            fpath.name,
            case_context={"deceased_name": dec_name, "dod": dod},
        )

        expected_type = CATEGORY_ALIASES.get(cache_data["doc_type"], cache_data["doc_type"])
        actual_type = CATEGORY_ALIASES.get(res["doc_type"], res["doc_type"])

        if actual_type == expected_type:
            doc_type_matches += 1

        extracted = res.get("extracted", {})
        for k, v in cache_data.items():
            if k == "doc_type":
                continue
            total_fields += 1
            if match_field_value(extracted.get(k), v):
                field_matches += 1

    type_accuracy = (doc_type_matches / len(sample_docs)) * 100.0
    field_accuracy = (field_matches / total_fields) * 100.0

    assert type_accuracy == 100.0
    assert field_accuracy >= 90.0
