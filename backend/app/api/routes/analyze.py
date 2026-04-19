import uuid

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.apify_google_maps import ApifyGoogleMapsError, fetch_google_reviews
from app.services.insights_stub import stub_insights_from_google_only

router = APIRouter(prefix="/api/v1", tags=["analyze"])


@router.post("/restaurants/analyze", response_model=AnalyzeResponse)
def analyze_restaurant(body: AnalyzeRequest) -> AnalyzeResponse:
    """
    Pipeline: Apify (Google Maps / Places actor) → normalise reviews → stub insights (LLM next).
    Requires APIFY_API_KEY and Apify access to the configured actor (see APIFY_GOOGLE_ACTOR_ID).
    """
    settings = get_settings()
    if not settings.apify_api_key:
        raise HTTPException(
            status_code=503,
            detail="APIFY_API_KEY is not configured. Add it to the repo root .env.local",
        )

    try:
        reviews, dataset_url = fetch_google_reviews(
            settings,
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
        )
    except ApifyGoogleMapsError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    insights = stub_insights_from_google_only(reviews)
    detail = (
        f"Apify returned {len(reviews)} Google reviews (actor={settings.apify_google_actor_id}). "
        "Next: add Claude/GPT for issues & recommendations."
    )
    if not reviews:
        detail = (
            "Apify run completed but no review text was returned "
            "(check search terms, location, or actor run on Apify Console). "
            f"Actor={settings.apify_google_actor_id}"
        )

    return AnalyzeResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
        insights=insights,
        detail=detail,
        apify_dataset_url=dataset_url,
    )
