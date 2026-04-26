"""Lightweight insights from review ratings until the LLM step is wired."""

from collections import Counter
from typing import Protocol

from app.schemas import InsightsPayload, SentimentBreakdown, SourceCounts


class ReviewLike(Protocol):
    source: str
    rating: float | None


def sentiment_from_star_ratings(reviews: list[ReviewLike]) -> SentimentBreakdown:
    ratings = [r.rating for r in reviews if r.rating is not None]
    if not ratings:
        return SentimentBreakdown(positive=0.0, neutral=1.0, negative=0.0)
    pos = sum(1 for r in ratings if r >= 4.0)
    neg = sum(1 for r in ratings if r <= 2.0)
    neu = len(ratings) - pos - neg
    n = float(len(ratings))
    return SentimentBreakdown(
        positive=round(pos / n, 4),
        neutral=round(neu / n, 4),
        negative=round(neg / n, 4),
    )


def stub_insights_from_reviews(reviews: list[ReviewLike]) -> InsightsPayload:
    """Populate counts + rough sentiment; issues/recommendations wait for LLM."""
    counts = Counter((r.source or "").lower() for r in reviews)
    return InsightsPayload(
        sentiment=sentiment_from_star_ratings(reviews),
        top_issues=[],
        recommendations=[
            "LLM step not connected yet — issues and actions will appear here.",
        ],
        sources=SourceCounts(
            google=counts.get("google", 0),
            yelp=counts.get("yelp", 0),
            tripadvisor=counts.get("tripadvisor", 0),
        ),
    )
