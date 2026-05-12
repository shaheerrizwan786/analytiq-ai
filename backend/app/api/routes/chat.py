"""Chat route — conversational AI advisor for a specific restaurant."""
from fastapi import APIRouter, Depends, Request

from app.api.dependencies import limiter, verify_api_key
from app.config import get_settings
from app.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat as llm_chat
from app.services.review_sync_store import create_default_sync_store

router = APIRouter(prefix="/api/v1", tags=["chat"])

_FALLBACK_NO_KEY = (
    "The AI advisor isn't configured yet — please add your OpenAI API key to .env.local "
    "and restart the backend server."
)
_FALLBACK_ERROR = (
    "Sorry, I couldn't reach the AI right now. Please try again in a moment."
)


@router.post("/restaurants/chat", response_model=ChatResponse)
@limiter.limit("60/minute")
def restaurant_chat(request: Request, body: ChatRequest, _: None = Depends(verify_api_key)) -> ChatResponse:
    settings = get_settings()

    if not settings.openai_api_key:
        return ChatResponse(reply=_FALLBACK_NO_KEY, fallback=True)

    # Load stored reviews to give LLM context
    sync_store = create_default_sync_store()
    reviews = sync_store.get_all_reviews(
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
    )

    history = [{"role": m.role, "content": m.content} for m in body.history]

    reply = llm_chat(
        restaurant_name=body.name.strip(),
        location=body.location.strip(),
        message=body.message,
        history=history,
        reviews=reviews,
        top_issues=body.top_issues,
        recommendations=body.recommendations,
        api_key=settings.openai_api_key,
    )

    if reply is None:
        return ChatResponse(reply=_FALLBACK_ERROR, fallback=True)

    return ChatResponse(reply=reply, fallback=False)
