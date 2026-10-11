"""Documents router for Virasat.

Provides routes for:
- GET /cases/{id}/documents: List documents for a case
- POST /cases/{id}/documents: Multipart upload, returns 202 Accepted, extracts in background
- GET /documents/{did}: Retrieve metadata and access URL for a specific document
- PATCH /documents/{did}: Correct extracted fields, sets confidence = 1.0 (human verified)
- DELETE /documents/{did}: Soft-delete a document
- GET /documents/{did}/download: Streaming proxy when signed URL is unavailable
"""

from fastapi import APIRouter, BackgroundTasks, File, Response, UploadFile, status

from app.deps import CurrentUser
from app.models.schemas import DocumentResponse, DocumentUpdateRequest
from app.services.documents import DocumentService

router = APIRouter(tags=["Documents"])
_doc_service = DocumentService()


@router.get("/cases/{id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    id: str,
    uid: str = CurrentUser,
):
    """List documents uploaded for a case."""
    docs = _doc_service.list_documents(case_id=id, uid=uid)
    return [DocumentResponse(**d) for d in docs]


@router.post("/cases/{id}/documents", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    uid: str = CurrentUser,
):
    """Upload a document (multipart) for automated classification and extraction.

    Accepts PDF, PNG, JPG only (verifies magic bytes). Max 10 MB, max 25 documents per case.
    Returns 202 Accepted with doc_id and status PENDING immediately, then runs extraction in the background.
    """
    file_bytes = await file.read()
    filename = file.filename or "uploaded_doc.pdf"

    # 1. Validate, store in GCS, and create PENDING Document row
    doc_response = _doc_service.upload_document(
        case_id=id,
        file_bytes=file_bytes,
        filename=filename,
        uid=uid,
    )

    # 2. Queue asynchronous extraction in background
    doc_id = doc_response["id"]
    background_tasks.add_task(
        _doc_service.extract_document_sync,
        case_id=id,
        doc_id=doc_id,
        file_bytes=file_bytes,
        filename=filename,
        uid=uid,
    )

    return DocumentResponse(**doc_response)


@router.get("/documents/{did}", response_model=DocumentResponse)
async def get_document(
    did: str,
    uid: str = CurrentUser,
):
    """Get metadata and signed access URL for a specific document."""
    doc = _doc_service.get_document(doc_id=did, uid=uid)
    return DocumentResponse(**doc)


@router.patch("/documents/{did}", response_model=DocumentResponse)
async def update_document(
    did: str,
    body: DocumentUpdateRequest,
    uid: str = CurrentUser,
):
    """Update or correct extracted fields for a document.

    Each manual edit writes ChangeLog and AuditLog and sets that field's confidence = 1.0.
    """
    payload = body.model_dump(exclude_unset=True)
    updated = _doc_service.patch_document(doc_id=did, payload=payload, uid=uid)
    return DocumentResponse(**updated)


@router.delete("/documents/{did}", status_code=status.HTTP_200_OK)
async def delete_document(
    did: str,
    uid: str = CurrentUser,
):
    """Soft-delete a document."""
    _doc_service.soft_delete_document(doc_id=did, uid=uid)
    return {"status": "deleted", "doc_id": did}


@router.get("/documents/{did}/download")
async def download_document(
    did: str,
    uid: str = CurrentUser,
):
    """Streaming proxy endpoint to download document when IAM signing is unavailable."""
    data, media_type, filename = _doc_service.get_document_bytes(doc_id=did, uid=uid)
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
