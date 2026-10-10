from typing import Any

from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import ChatRequest

router = APIRouter(tags=["Chat"])


@router.post("/chat")
async def chat_sse(
    body: ChatRequest,
    uid: str = CurrentUser,
):
    """Multilingual AI chat assistant streaming citation-backed answers via SSE."""
    raise NotImplementedException()


@router.get("/cases/{id}/chat", response_model=list[dict[str, Any]])
async def get_chat_history(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve chat conversation history for a case."""
    raise NotImplementedException()
