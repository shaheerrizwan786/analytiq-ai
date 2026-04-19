"""Lightweight insights from review ratings until the LLM step is wired."""

from app.schemas import InsightsPayload, SentimentBreakdown, SourceCounts
from app.services.apify_google_maps import GoogleReviewNormalized


def sentiment_from_star_ratings(reviews: list[GoogleReviewNormalized]) -> SentimentBreakdown:
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


def stub_insights_from_google_only(
    reviews: list[GoogleReviewNormalized],
) -> InsightsPayload:
    """Populate counts + rough sentiment; issues/recommendations wait for LLM."""
    return InsightsPayload(
        sentiment=sentiment_from_star_ratings(reviews),
        top_issues=[],
        recommendations=[
            "LLM step not connected yet — issues and actions will appear here.",
        ],
        sources=SourceCounts(google=len(reviews), yelp=0, tripadvisor=0),
    )
