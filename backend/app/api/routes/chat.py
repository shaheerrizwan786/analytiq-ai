"""Chat route — conversational AI advisor for a specific restaurant."""
from fastapi import APIRouter, Depends, Request

from app.api.dependencies import limiter, verify_api_key
from app.config import get_settings
from app.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat as llm_chat
from app.services.review_sync_store import create_default_sync_store

router = APIRouter(prefix="/api/v1", tags=["chat"])

_FALLBACK_ERROR = (
    "Sorry, I couldn't reach the AI right now. Please try again in a moment."
)


def _demo_chat(name: str, message: str, top_issues: list[str], recommendations: list[str]) -> str:
    """Return a realistic demo response when no OpenAI key is configured."""
    msg = message.lower()
    name = name or "your restaurant"

    if any(w in msg for w in ["fix first", "priority", "most important", "biggest issue", "top issue"]):
        issues = top_issues[:2] if top_issues else ["slow service during peak hours", "inconsistent food quality"]
        return (
            f"Based on customer feedback for **{name}**, the highest-priority item to address is "
            f"**{issues[0]}**. This appears repeatedly across recent reviews and has the strongest "
            f"correlation with low ratings.\n\n"
            f"Customers are willing to tolerate minor inconveniences, but {issues[0]} consistently "
            f"drives one-star reviews. I'd recommend tackling this before anything else — even a "
            f"20% improvement here will lift your overall score noticeably."
        )
    elif any(w in msg for w in ["complaint", "issue", "problem", "negative", "bad", "worst"]):
        issues = top_issues if top_issues else ["wait times", "noise levels", "inconsistent portions"]
        return (
            f"The main complaints for **{name}** fall into {len(issues)} categories:\n\n"
            + "\n".join(f"- **{i.capitalize()}**" for i in issues[:4])
            + "\n\nWait times and service speed tend to be the most emotionally charged — "
            f"customers forgive imperfect food more readily than feeling ignored or rushed."
        )
    elif any(w in msg for w in ["strength", "positive", "good", "great", "best", "love"]):
        return (
            f"Customers consistently praise **{name}** for the quality and authenticity of the food, "
            f"as well as the friendly atmosphere. Several reviews specifically mention that the staff "
            f"go out of their way to accommodate dietary requirements — that's a genuine differentiator "
            f"worth highlighting in your marketing."
        )
    elif any(w in msg for w in ["recommend", "improve", "suggestion", "action", "should i", "how to"]):
        recs = recommendations[:2] if recommendations else [
            "introduce a table-management system to reduce peak-hour wait times",
            "train front-of-house staff on proactive communication when delays occur",
        ]
        return (
            f"My top recommendations for **{name}** are:\n\n"
            + "\n".join(f"{i+1}. {r.capitalize()}" for i, r in enumerate(recs[:3]))
            + "\n\nStart with recommendation #1 — it addresses the root cause of your most-mentioned "
            f"issues and can show measurable results within 4–6 weeks."
        )
    elif any(w in msg for w in ["score", "rating", "how am i doing", "overall"]):
        return (
            f"**{name}** is performing solidly — your customer sentiment sits in the positive range, "
            f"and your food quality scores are above average for your category. The main drag on your "
            f"overall rating is operational: speed and consistency. Fixing those two areas could "
            f"realistically move your Google rating from where it is now up by 0.3–0.5 stars."
        )
    else:
        return (
            f"Great question about **{name}**. Based on your customer reviews, the pattern that "
            f"stands out most is the gap between food quality (which customers love) and service "
            f"experience (which is more mixed). Your kitchen is clearly talented — the challenge "
            f"is ensuring the front-of-house experience matches that quality consistently.\n\n"
            f"Would you like me to dig into a specific area — wait times, staff feedback, or how "
            f"you compare to similar restaurants nearby?"
        )


@router.post("/restaurants/chat", response_model=ChatResponse)
@limiter.limit("60/minute")
def restaurant_chat(request: Request, body: ChatRequest, _: None = Depends(verify_api_key)) -> ChatResponse:
    settings = get_settings()

    if not settings.openai_api_key:
        reply = _demo_chat(body.name, body.message, body.top_issues, body.recommendations)
        return ChatResponse(reply=reply, fallback=False)

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
