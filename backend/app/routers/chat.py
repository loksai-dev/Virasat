"""Chat routes for Ask Virasat streaming GraphRAG assistant."""

from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.db.repositories import ChatMessageRepo
from app.deps import CurrentUser
from app.models.schemas import ChatRequest
from app.services.case_service import check_case_access
from app.services.chat import stream_chat_response

router = APIRouter(tags=["Chat"])


@router.post("/chat")
async def chat_sse(
    body: ChatRequest,
    uid: str = CurrentUser,
):
    """Multilingual AI chat assistant streaming citation-backed answers via SSE."""
    # Validate case access and ownership
    check_case_access(body.case_id, uid, for_mutation=False)

    return StreamingResponse(
        stream_chat_response(
            case_id=body.case_id,
            message=body.message,
            language=body.language,
            uid=uid,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/cases/{id}/chat", response_model=list[dict[str, Any]])
async def get_chat_history(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve chat conversation history for a case."""
    check_case_access(id, uid, for_mutation=False)

    messages = ChatMessageRepo.list_by_case(id, limit=50)
    return messages
