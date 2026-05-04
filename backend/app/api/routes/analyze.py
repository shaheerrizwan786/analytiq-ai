import uuid

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import AnalyzeRequest, AnalyzeResponse, ReviewItem
from app.services.apify_reviews_multi import ApifyReviewsError, fetch_reviews_for_source
from app.services.insights_stub import stub_insights_from_reviews
from app.services.llm_service import generate_insights
from app.services.review_sync_store import create_default_sync_store, reset_all
from app.services.search_url_resolver import (
    SearchUrlResolverError,
    resolve_tripadvisor_url_from_search,
    resolve_yelp_url_from_search,
)
from app.services.tripadvisor_discovery import (
    TripAdvisorDiscoveryError,
    discover_tripadvisor_place_url,
)
from app.services.yelp_discovery import YelpDiscoveryError, discover_yelp_business_url

router = APIRouter(prefix="/api/v1", tags=["analyze"])


@router.post("/restaurants/analyze", response_model=AnalyzeResponse)
def analyze_restaurant(body: AnalyzeRequest) -> AnalyzeResponse:
    """Incremental sync across Google + TripAdvisor + Yelp using name + location only.

    URL resolution order (for URL-based sources):
    - cache -> search resolver -> discovery actor fallback
    """
    settings = get_settings()
    if not settings.apify_api_key:
        raise HTTPException(
            status_code=503,
            detail="APIFY_API_KEY is not configured. Add it to the repo root .env.local",
        )

    sync_store = create_default_sync_store()

    all_new_reviews = []
    dataset_urls: list[str] = []
    range_from_values = []
    range_to_values = []
    total_new = 0
    source_errors: list[str] = []
    source_stats: list[str] = []

    # Resolve TripAdvisor URL (cache -> search -> discovery fallback)
    resolved_tripadvisor_url = sync_store.get_source_place_link(
        source="tripadvisor",
        restaurant_name=body.name,
        restaurant_location=body.location,
    )
    if not resolved_tripadvisor_url:
        try:
            t_search_url = resolve_tripadvisor_url_from_search(body.name.strip(), body.location.strip())
        except SearchUrlResolverError as e:
            source_errors.append(f"tripadvisor-search: {str(e)}")
            t_search_url = None

        if t_search_url:
            resolved_tripadvisor_url = t_search_url
            sync_store.upsert_source_place_link(
                source="tripadvisor",
                restaurant_name=body.name,
                restaurant_location=body.location,
                source_url=t_search_url,
            )
        else:
            try:
                t_url, t_place_id, t_dataset = discover_tripadvisor_place_url(
                    settings,
                    restaurant_name=body.name.strip(),
                    restaurant_location=body.location.strip(),
                )
                if t_dataset:
                    dataset_urls.append(f"tripadvisor-discovery: {t_dataset}")
                if t_url:
                    resolved_tripadvisor_url = t_url
                    sync_store.upsert_source_place_link(
                        source="tripadvisor",
                        restaurant_name=body.name,
                        restaurant_location=body.location,
                        source_url=t_url,
                        source_place_id=t_place_id,
                    )
                else:
                    source_errors.append("tripadvisor-discovery: no matching place URL found")
            except TripAdvisorDiscoveryError as e:
                source_errors.append(f"tripadvisor-discovery: {str(e)}")

    # Resolve Yelp URL (cache -> search -> discovery fallback)
    resolved_yelp_url = None
    if settings.apify_yelp_enabled:
        resolved_yelp_url = sync_store.get_source_place_link(
            source="yelp",
            restaurant_name=body.name,
            restaurant_location=body.location,
        )
        if not resolved_yelp_url:
            try:
                y_search_url = resolve_yelp_url_from_search(body.name.strip(), body.location.strip())
            except SearchUrlResolverError as e:
                source_errors.append(f"yelp-search: {str(e)}")
                y_search_url = None

            if y_search_url and "yelp.com/biz/" in y_search_url.lower():
                resolved_yelp_url = y_search_url
                sync_store.upsert_source_place_link(
                    source="yelp",
                    restaurant_name=body.name,
                    restaurant_location=body.location,
                    source_url=y_search_url,
                )
            else:
                try:
                    y_url, y_place_id, y_dataset = discover_yelp_business_url(
                        settings,
                        restaurant_name=body.name.strip(),
                        restaurant_location=body.location.strip(),
                    )
                    if y_dataset:
                        dataset_urls.append(f"yelp-discovery: {y_dataset}")
                    if y_url:
                        resolved_yelp_url = y_url
                        sync_store.upsert_source_place_link(
                            source="yelp",
                            restaurant_name=body.name,
                            restaurant_location=body.location,
                            source_url=y_url,
                            source_place_id=y_place_id,
                        )
                    else:
                        source_errors.append("yelp-discovery: no matching business URL found")
                except YelpDiscoveryError as e:
                    source_errors.append(f"yelp-discovery: {str(e)}")
    else:
        source_stats.append("yelp(skipped:disabled)")

    # Fetch order: Google -> TripAdvisor -> (Yelp if enabled)
    for source in ("google", "tripadvisor", "yelp"):
        if source == "yelp" and not settings.apify_yelp_enabled:
            continue

        if source == "yelp" and not resolved_yelp_url:
            source_stats.append("yelp(skipped:no_resolved_url)")
            continue

        # Always fetch the latest N reviews (no since filter).
        # Deduplication in the store via review_key prevents double-counting.
        try:
            reviews, dataset_url, stats = fetch_reviews_for_source(
                settings,
                source=source,
                restaurant_name=body.name.strip(),
                restaurant_location=body.location.strip(),
                since=None,
                tripadvisor_url=resolved_tripadvisor_url,
                yelp_url=resolved_yelp_url,
            )
        except ApifyReviewsError as e:
            source_errors.append(f"{source}: {str(e)}")
            continue

        inserted, window = sync_store.upsert_reviews_and_state(
            source=source,
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
            rows=[
                {
                    "review_key": r.review_key,
                    "review_date_iso": r.date_iso,
                    "text": r.text,
                    "rating": r.rating,
                }
                for r in reviews
            ],
        )

        source_stats.append(
            f"{source}(raw={stats['raw_items_count']},norm={stats['normalized_count']},"
            f"after_since={stats['after_since_count']},returned={stats['returned_count']},"
            f"inserted={inserted},limit={stats['limit']})"
        )

        if inserted > 0:
            all_new_reviews.extend(reviews[:inserted])
            total_new += inserted

        if dataset_url:
            dataset_urls.append(f"{source}: {dataset_url}")
        if window.since is not None:
            range_from_values.append(window.since)
        if window.until is not None:
            range_to_values.append(window.until)

    # Load ALL stored reviews (not just new ones) for the response
    all_stored_reviews = sync_store.get_all_reviews(
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
    )

    # Compute sentiment + source counts from all stored reviews (stub is fast/free)
    stub = stub_insights_from_reviews(all_stored_reviews)

    # Try LLM insights; fall back to stub if key missing or call fails
    if settings.openai_api_key and all_stored_reviews:
        llm_result = generate_insights(
            reviews=all_stored_reviews,
            api_key=settings.openai_api_key,
            sentiment=stub.sentiment,
            sources=stub.sources,
        )
        insights = llm_result if llm_result is not None else stub
    else:
        insights = stub

    review_items = [
        ReviewItem(
            id=r.review_key,
            source=r.source,
            text=r.text,
            rating=r.rating,
            date_iso=r.date_iso,
        )
        for r in all_stored_reviews
        if r.text
    ]

    if total_new:
        detail = (
            f"Incremental sync completed across Google + TripAdvisor + Yelp: "
            f"{total_new} new reviews saved for '{body.name.strip()}' ({body.location.strip()})."
        )
    else:
        detail = (
            "Incremental sync completed: no new reviews after stored latest dates. "
            "No duplicate re-ingestion was persisted."
        )

    if source_stats:
        detail = detail + " Stats: " + " | ".join(source_stats)
    if source_errors:
        detail = detail + " Partial source errors: " + " | ".join(source_errors)

    return AnalyzeResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
        insights=insights,
        reviews=review_items,
        detail=detail,
        apify_dataset_url="\n".join(dataset_urls) if dataset_urls else None,
        extracted_range_from=min(range_from_values).isoformat() if range_from_values else None,
        extracted_range_to=max(range_to_values).isoformat() if range_to_values else None,
        new_reviews_count=total_new,
    )


@router.post("/admin/reset-review-cache")
def reset_review_cache() -> dict[str, str]:
    """One-click cleanup for local test DB tables (reviews + sync state + source links)."""
    reset_all()
    return {"status": "ok", "detail": "review cache cleared"}
