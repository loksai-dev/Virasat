
from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import AuditLogEntry, AuditVerifyResponse

router = APIRouter(tags=["Audit"])


@router.get("/cases/{id}/audit", response_model=list[AuditLogEntry])
async def get_audit_trail(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve hash-chained tamper-evident audit log entries for a case."""
    raise NotImplementedException()


@router.get("/cases/{id}/audit/verify", response_model=AuditVerifyResponse)
async def verify_audit_chain(
    id: str,
    uid: str = CurrentUser,
):
    """Cryptographically verify integrity of the SHA-256 audit log hash chain."""
    raise NotImplementedException()
