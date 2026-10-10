
from fastapi import APIRouter, File, UploadFile

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import DocumentResponse, DocumentUpdateRequest

router = APIRouter(tags=["Documents"])


@router.get("/cases/{id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    id: str,
    uid: str = CurrentUser,
):
    """List documents uploaded for a case."""
    raise NotImplementedException()


@router.post("/cases/{id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    id: str,
    file: UploadFile = File(...),
    uid: str = CurrentUser,
):
    """Upload a document (multipart) for automated extraction."""
    raise NotImplementedException()


@router.get("/documents/{did}", response_model=DocumentResponse)
async def get_document(
    did: str,
    uid: str = CurrentUser,
):
    """Get metadata for a specific document."""
    raise NotImplementedException()


@router.patch("/documents/{did}", response_model=DocumentResponse)
async def update_document(
    did: str,
    body: DocumentUpdateRequest,
    uid: str = CurrentUser,
):
    """Update metadata or status for a document."""
    raise NotImplementedException()


@router.delete("/documents/{did}")
async def delete_document(
    did: str,
    uid: str = CurrentUser,
):
    """Delete a document."""
    raise NotImplementedException()
