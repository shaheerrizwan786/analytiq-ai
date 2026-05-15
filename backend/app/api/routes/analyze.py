import asyncio
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.dependencies import limiter, verify_api_key
from app.config import get_settings
from app.schemas import AnalyzeRequest, AnalyzeResponse, ReviewItem
from app.services.apify_reviews_multi import ApifyReviewsError, fetch_reviews_for_source_async
from app.services.apify_google_reviews import (
    GoogleReviewsError,
    fetch_google_reviews_detailed_async,
)
from app.services.insights_stub import stub_insights_from_reviews
from app.services.llm_service import generate_insights
from app.services.review_sync_store import create_default_sync_store, reset_all
from app.services.search_url_resolver import (
    SearchUrlResolverError,
    resolve_tripadvisor_url_from_search_async,
    resolve_yelp_url_from_search_async,
)
from app.services.tripadvisor_discovery import (
    TripAdvisorDiscoveryError,
    discover_tripadvisor_place_url_async,
)
from app.services.yelp_discovery import YelpDiscoveryError, discover_yelp_business_url
from app.services.google_places_service import GooglePlacesService

router = APIRouter(prefix="/api/v1", tags=["analyze"])

logger = logging.getLogger(__name__)

_PII_CONTEXT_KEYS = frozenset({"authorName", "profileUrl", "authorUrl", "reviewerUrl"})


def _strip_pii(review_context: dict | None) -> dict | None:
    """Remove known PII keys from a review_context dict before persistence."""
    if not review_context:
        return review_context
    return {k: v for k, v in review_context.items() if k not in _PII_CONTEXT_KEYS}


@router.post("/restaurants/analyze", response_model=AnalyzeResponse)
@limiter.limit("10/minute")
async def analyze_restaurant(
    request: Request, body: AnalyzeRequest, _: None = Depends(verify_api_key)
) -> AnalyzeResponse:
    """Incremental sync across Google + TripAdvisor + Yelp (async parallel Apify, same as /stream)."""
    settings = get_settings()
    if not settings.apify_api_key:
        raise HTTPException(
            status_code=503,
            detail="APIFY_API_KEY is not configured. Add it to the repo root .env.local",
        )

    sync_store = create_default_sync_store()

    # Fast path: if we already have cached reviews, skip Apify entirely
    _cached_check = sync_store.get_all_reviews(
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
    )
    if _cached_check:
        stub = stub_insights_from_reviews(_cached_check)
        if settings.openai_api_key:
            _llm = generate_insights(
                reviews=_cached_check,
                api_key=settings.openai_api_key,
                sentiment=stub.sentiment,
                sources=stub.sources,
            )
            insights = _llm if _llm is not None else stub
        else:
            insights = stub
        review_items_cached = [
            ReviewItem(
                id=r.review_key,
                source=r.source,
                text=r.text,
                rating=r.rating,
                date_iso=r.date_iso,
            )
            for r in _cached_check
            if r.text
        ]
        return AnalyzeResponse(
            job_id=str(uuid.uuid4()),
            status="completed",
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
            insights=insights,
            reviews=review_items_cached,
            detail=f"Served from cache: {len(_cached_check)} reviews for '{body.name.strip()}'.",
            extracted_range_from=None,
            extracted_range_to=None,
            new_reviews_count=0,
        )

    all_new_reviews: list = []
    dataset_urls: list[str] = []
    range_from_values: list = []
    range_to_values: list = []
    total_new = 0
    source_errors: list[str] = []
    source_stats: list[str] = []

    search_display_name = (
        f"{body.name} {body.address}".strip() if body.address else body.name
    ).strip()

    async def fetch_google_task():
        """Resolve Google Maps target: explicit place_id > Autocomplete (if no id) > URL > cache."""
        cached_google_url: str | None = None
        autocomplete_pid: str | None = None

        if body.google_place_id:
            cached_google_url = f"https://www.google.com/maps/place/?q=place_id:{body.google_place_id}"
        elif settings.google_api_key:
            try:

                def _first_place_id() -> str | None:
                    svc = GooglePlacesService()
                    return svc.resolve_first_place_id_for_restaurant(
                        restaurant_name=body.name.strip(),
                        restaurant_location=body.location.strip(),
                    )

                autocomplete_pid = await asyncio.to_thread(_first_place_id)
            except ValueError:
                logger.warning(
                    "GOOGLE_API_KEY not configured; skipping Places autocomplete for REST analyze"
                )
            except Exception as e:
                logger.warning("Places autocomplete failed (ignored): %s", e)

            if autocomplete_pid:
                cached_google_url = (
                    f"https://www.google.com/maps/place/?q=place_id:{autocomplete_pid}"
                )
                logger.info(
                    "REST analyze: using first Autocomplete place_id (%s…)",
                    autocomplete_pid[:12],
                )

        if not cached_google_url and body.google_place_url:
            cached_google_url = body.google_place_url

        if not cached_google_url:
            cached_google_url = sync_store.get_source_place_link(
                source="google",
                restaurant_name=body.name,
                restaurant_location=body.location,
            )

        had_place_hint = bool(cached_google_url)
        result = await fetch_google_reviews_detailed_async(
            settings,
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
            since=None,
            cached_place_url=cached_google_url,
        )
        return (had_place_hint,) + result

    async def resolve_tripadvisor_url_task():
        resolved_url = sync_store.get_source_place_link(
            source="tripadvisor",
            restaurant_name=body.name,
            restaurant_location=body.location,
        )

        if resolved_url:
            return resolved_url, None

        try:
            t_search_url = await resolve_tripadvisor_url_from_search_async(
                search_display_name,
                body.location.strip(),
                settings,
            )
            if t_search_url:
                sync_store.upsert_source_place_link(
                    source="tripadvisor",
                    restaurant_name=body.name,
                    restaurant_location=body.location,
                    source_url=t_search_url,
                )
                return t_search_url, None
        except SearchUrlResolverError as e:
            logger.warning("TripAdvisor search resolver failed: %s", e)
            source_errors.append(f"tripadvisor-search: {str(e)}")

        try:
            t_url, t_place_id, t_dataset = await discover_tripadvisor_place_url_async(
                settings,
                restaurant_name=body.name.strip(),
                restaurant_location=body.location.strip(),
            )
            if t_dataset:
                dataset_urls.append(f"tripadvisor-discovery: {t_dataset}")
            if t_url:
                sync_store.upsert_source_place_link(
                    source="tripadvisor",
                    restaurant_name=body.name,
                    restaurant_location=body.location,
                    source_url=t_url,
                    source_place_id=t_place_id,
                )
                return t_url, t_dataset
        except TripAdvisorDiscoveryError as e:
            logger.error("TripAdvisor discovery actor failed: %s", e)
            source_errors.append(f"tripadvisor-discovery: {str(e)}")
        else:
            source_errors.append("tripadvisor-discovery: no matching place URL found")

        return None, None

    async def resolve_yelp_url_task():
        if not settings.apify_yelp_enabled:
            return None

        resolved_url = sync_store.get_source_place_link(
            source="yelp",
            restaurant_name=body.name,
            restaurant_location=body.location,
        )
        if resolved_url:
            return resolved_url

        try:
            y_search_url = await resolve_yelp_url_from_search_async(
                search_display_name,
                body.location.strip(),
                settings,
            )
            if y_search_url and "yelp.com/biz/" in y_search_url.lower():
                sync_store.upsert_source_place_link(
                    source="yelp",
                    restaurant_name=body.name,
                    restaurant_location=body.location,
                    source_url=y_search_url,
                )
                return y_search_url
        except SearchUrlResolverError as e:
            logger.warning("Yelp search resolver failed: %s", e)
            source_errors.append(f"yelp-search: {str(e)}")

        try:
            y_url, y_place_id, y_dataset = await asyncio.to_thread(
                discover_yelp_business_url,
                settings,
                restaurant_name=body.name.strip(),
                restaurant_location=body.location.strip(),
            )
            if y_dataset:
                dataset_urls.append(f"yelp-discovery: {y_dataset}")
            if y_url:
                sync_store.upsert_source_place_link(
                    source="yelp",
                    restaurant_name=body.name,
                    restaurant_location=body.location,
                    source_url=y_url,
                    source_place_id=y_place_id,
                )
                return y_url
        except YelpDiscoveryError as e:
            source_errors.append(f"yelp-discovery: {str(e)}")
        else:
            source_errors.append("yelp-discovery: no matching business URL found")

        return None

    async def fetch_tripadvisor_reviews_task(tripadvisor_url: str):
        return await fetch_reviews_for_source_async(
            settings,
            source="tripadvisor",
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
            since=None,
            tripadvisor_url=tripadvisor_url,
            yelp_url=None,
        )

    async def fetch_yelp_reviews_task(yelp_url: str):
        return await fetch_reviews_for_source_async(
            settings,
            source="yelp",
            restaurant_name=body.name.strip(),
            restaurant_location=body.location.strip(),
            since=None,
            tripadvisor_url=None,
            yelp_url=yelp_url,
        )

    pending_tasks: dict[str, asyncio.Task[Any]] = {}
    pending_tasks["google_reviews"] = asyncio.create_task(fetch_google_task())
    pending_tasks["tripadvisor_url"] = asyncio.create_task(resolve_tripadvisor_url_task())

    if settings.apify_yelp_enabled:
        pending_tasks["yelp_url"] = asyncio.create_task(resolve_yelp_url_task())
    else:
        source_stats.append("yelp(skipped:disabled)")

    while pending_tasks:
        done, _pending = await asyncio.wait(
            pending_tasks.values(),
            return_when=asyncio.FIRST_COMPLETED,
        )

        for finished in done:
            task_key: str | None = None
            for k, t in list(pending_tasks.items()):
                if t == finished:
                    task_key = k
                    del pending_tasks[k]
                    break

            if not task_key:
                continue

            try:
                result = finished.result()

                if task_key == "google_reviews":
                    had_hint, google_reviews, google_place_url, google_dataset_urls, google_stats = result

                    if google_place_url and not had_hint:
                        sync_store.upsert_source_place_link(
                            source="google",
                            restaurant_name=body.name,
                            restaurant_location=body.location,
                            source_url=google_place_url,
                            source_place_id=google_stats.get("place_id"),
                        )

                    inserted, window = sync_store.upsert_reviews_and_state(
                        source="google",
                        restaurant_name=body.name.strip(),
                        restaurant_location=body.location.strip(),
                        rows=[
                            {
                                "review_key": r.review_key,
                                "review_date_iso": r.date_iso,
                                "text": r.text,
                                "rating": r.rating,
                                "review_context": _strip_pii(r.review_context),
                                "review_detailed_rating": r.review_detailed_rating,
                            }
                            for r in google_reviews
                        ],
                    )

                    source_stats.append(
                        f"google(returned={google_stats['returned_count']},"
                        f"inserted={inserted},limit={google_stats['limit']})"
                    )

                    if inserted > 0:
                        all_new_reviews.extend(google_reviews[:inserted])
                        total_new += inserted

                    if google_dataset_urls:
                        dataset_urls.append(f"google: {google_dataset_urls}")
                    if window.since is not None:
                        range_from_values.append(window.since)
                    if window.until is not None:
                        range_to_values.append(window.until)

                elif task_key == "tripadvisor_url":
                    tripadvisor_url, _t_ds = result

                    if tripadvisor_url:
                        pending_tasks["tripadvisor_reviews"] = asyncio.create_task(
                            fetch_tripadvisor_reviews_task(tripadvisor_url)
                        )
                    else:
                        source_stats.append("tripadvisor(skipped:no_resolved_url)")

                elif task_key == "yelp_url":
                    yelp_url = result

                    if yelp_url:
                        pending_tasks["yelp_reviews"] = asyncio.create_task(
                            fetch_yelp_reviews_task(yelp_url)
                        )
                    else:
                        source_stats.append("yelp(skipped:no_resolved_url)")

                elif task_key == "tripadvisor_reviews":
                    reviews, dataset_url, stats = result

                    inserted, window = sync_store.upsert_reviews_and_state(
                        source="tripadvisor",
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
                        f"tripadvisor(raw={stats['raw_items_count']},norm={stats['normalized_count']},"
                        f"after_since={stats['after_since_count']},returned={stats['returned_count']},"
                        f"inserted={inserted},limit={stats['limit']})"
                    )

                    if inserted > 0:
                        all_new_reviews.extend(reviews[:inserted])
                        total_new += inserted

                    if dataset_url:
                        dataset_urls.append(f"tripadvisor: {dataset_url}")
                    if window.since is not None:
                        range_from_values.append(window.since)
                    if window.until is not None:
                        range_to_values.append(window.until)

                elif task_key == "yelp_reviews":
                    reviews, dataset_url, stats = result

                    inserted, window = sync_store.upsert_reviews_and_state(
                        source="yelp",
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
                        f"yelp(raw={stats['raw_items_count']},norm={stats['normalized_count']},"
                        f"after_since={stats['after_since_count']},returned={stats['returned_count']},"
                        f"inserted={inserted},limit={stats['limit']})"
                    )

                    if inserted > 0:
                        all_new_reviews.extend(reviews[:inserted])
                        total_new += inserted

                    if dataset_url:
                        dataset_urls.append(f"yelp: {dataset_url}")
                    if window.since is not None:
                        range_from_values.append(window.since)
                    if window.until is not None:
                        range_to_values.append(window.until)

            except GoogleReviewsError as e:
                source_errors.append(f"google: {str(e)}")
            except ApifyReviewsError as e:
                if "tripadvisor" in task_key:
                    source_errors.append(f"tripadvisor: {str(e)}")
                elif "yelp" in task_key:
                    source_errors.append(f"yelp: {str(e)}")
            except Exception as e:
                logger.exception("Unexpected error in async analyze task %s", task_key)
                if "google" in task_key:
                    source_errors.append(f"google: {str(e)}")
                elif "tripadvisor" in task_key:
                    source_errors.append(f"tripadvisor: {str(e)}")
                elif "yelp" in task_key:
                    source_errors.append(f"yelp: {str(e)}")

    # Load ALL stored reviews (not just new ones) for the response
    all_stored_reviews = sync_store.get_all_reviews(
        restaurant_name=body.name.strip(),
        restaurant_location=body.location.strip(),
    )

    stub = stub_insights_from_reviews(all_stored_reviews)

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

    if settings.include_empty_reviews:
        review_items = [
            ReviewItem(
                id=r.review_key,
                source=r.source,
                text=r.text,
                rating=r.rating,
                date_iso=r.date_iso,
                review_context=r.review_context,
                review_detailed_rating=r.review_detailed_rating,
            )
            for r in all_stored_reviews
        ]
    else:
        review_items = [
            ReviewItem(
                id=r.review_key,
                source=r.source,
                text=r.text,
                rating=r.rating,
                date_iso=r.date_iso,
                review_context=r.review_context,
                review_detailed_rating=r.review_detailed_rating,
            )
            for r in all_stored_reviews
            if r.text and r.text.strip()
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
        logger.warning(
            "Source errors during analysis",
            extra={"errors": source_errors, "restaurant": body.name},
        )
        detail = detail + " Some sources were unavailable."

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
def reset_review_cache(_: None = Depends(verify_api_key)) -> dict[str, str]:
    """One-click cleanup for local test DB tables (reviews + sync state + source links)."""
    reset_all()
    return {"status": "ok", "detail": "review cache cleared"}
