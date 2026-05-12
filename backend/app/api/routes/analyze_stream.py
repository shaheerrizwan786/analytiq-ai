import uuid
import logging
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.config import get_settings, Settings
from app.services.apify_reviews_multi import ApifyReviewsError, fetch_reviews_for_source
from app.services.apify_google_reviews import (
    GoogleReviewsError,
    fetch_google_reviews_detailed,
)
from app.services.insights_stub import stub_insights_from_reviews
from app.services.review_sync_store import create_default_sync_store
from app.services.search_url_resolver import (
    SearchUrlResolverError,
    resolve_tripadvisor_url_from_search,
    resolve_yelp_url_from_search,
)
from app.services.tripadvisor_discovery import (
    TripAdvisorDiscoveryError,
    discover_tripadvisor_place_url,
)

router = APIRouter(prefix="/api/v1", tags=["analyze"])


class AnalyzeStreamRequest(BaseModel):
    name: str
    location: str
    google_place_id: str | None = None


async def analyze_restaurant_stream(
    name: str,
    location: str,
    google_place_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream progress updates as SSE while analyzing restaurant reviews."""

    def send_progress(stage: str, status: str, message: str = ""):
        """Helper to format SSE message."""
        import json
        return f"data: {json.dumps({'stage': stage, 'status': status, 'message': message})}\n\n"

    settings = get_settings()
    if not settings.apify_api_key:
        yield send_progress("error", "failed", "APIFY_API_KEY is not configured")
        return

    sync_store = create_default_sync_store()

    all_new_reviews = []
    dataset_urls: list[str] = []
    range_from_values = []
    range_to_values = []
    total_new = 0
    source_errors: list[str] = []
    source_stats: list[str] = []

    # Helper functions for async tasks
    async def fetch_google_task():
        """Fetch Google reviews in background thread."""
        if google_place_id:
            logger.info("Using request google_place_id for Google fetch: %s", google_place_id)
            cached_google_url = f"https://www.google.com/maps/place/?q=place_id:{google_place_id}"
        else:
            logger.info("No google_place_id in request body; falling back to cached Google URL")
            cached_google_url = sync_store.get_source_place_link(
                source="google",
                restaurant_name=name,
                restaurant_location=location,
            )

        return await asyncio.to_thread(
            fetch_google_reviews_detailed,
            settings,
            restaurant_name=name.strip(),
            restaurant_location=location.strip(),
            since=None,
            cached_place_url=cached_google_url,
        )

    async def resolve_tripadvisor_url_task():
        """Resolve TripAdvisor URL (search + fallback to discovery)."""
        resolved_url = sync_store.get_source_place_link(
            source="tripadvisor",
            restaurant_name=name,
            restaurant_location=location,
        )

        if resolved_url:
            return resolved_url, None

        logger.info(f"Trying TripAdvisor search resolver for: {name}, {location}")
        try:
            t_search_url = await asyncio.to_thread(
                resolve_tripadvisor_url_from_search,
                name.strip(),
                location.strip(),
                settings
            )
            if t_search_url:
                logger.info(f"TripAdvisor URL from search resolver: {t_search_url}")
                sync_store.upsert_source_place_link(
                    source="tripadvisor",
                    restaurant_name=name,
                    restaurant_location=location,
                    source_url=t_search_url,
                )
                return t_search_url, None
        except SearchUrlResolverError as e:
            logger.warning(f"TripAdvisor search resolver failed: {str(e)}")
            source_errors.append(f"tripadvisor-search: {str(e)}")

        logger.info("Falling back to TripAdvisor discovery actor")
        try:
            t_url, t_place_id, t_dataset = await asyncio.to_thread(
                discover_tripadvisor_place_url,
                settings,
                restaurant_name=name.strip(),
                restaurant_location=location.strip(),
            )
            if t_dataset:
                dataset_urls.append(f"tripadvisor-discovery: {t_dataset}")
            if t_url:
                logger.info(f"TripAdvisor URL from discovery actor: {t_url}")
                sync_store.upsert_source_place_link(
                    source="tripadvisor",
                    restaurant_name=name,
                    restaurant_location=location,
                    source_url=t_url,
                    source_place_id=t_place_id,
                )
                return t_url, t_dataset
        except TripAdvisorDiscoveryError as e:
            logger.error(f"TripAdvisor discovery actor failed: {str(e)}")
            source_errors.append(f"tripadvisor-discovery: {str(e)}")

        return None, None

    async def resolve_yelp_url_task():
        """Resolve Yelp URL via search."""
        logger.info(f"Trying Yelp search resolver for: {name}, {location}")
        try:
            y_search_url = await asyncio.to_thread(
                resolve_yelp_url_from_search,
                name.strip(),
                location.strip(),
                settings,
            )
            if y_search_url:
                logger.info(f"Yelp URL from search resolver: {y_search_url}")
                sync_store.upsert_source_place_link(
                    source="yelp",
                    restaurant_name=name,
                    restaurant_location=location,
                    source_url=y_search_url,
                )
                return y_search_url
        except SearchUrlResolverError as e:
            logger.warning(f"Yelp search resolver failed: {str(e)}")
            source_errors.append(f"yelp-search: {str(e)}")

        return None

    async def fetch_tripadvisor_reviews_task(tripadvisor_url: str):
        """Fetch TripAdvisor reviews."""
        return await asyncio.to_thread(
            fetch_reviews_for_source,
            settings,
            source="tripadvisor",
            restaurant_name=name.strip(),
            restaurant_location=location.strip(),
            since=None,
            tripadvisor_url=tripadvisor_url,
            yelp_url=None,
        )

    async def fetch_yelp_reviews_task(yelp_url: str):
        """Fetch Yelp reviews."""
        return await asyncio.to_thread(
            fetch_reviews_for_source,
            settings,
            source="yelp",
            restaurant_name=name.strip(),
            restaurant_location=location.strip(),
            since=None,
            tripadvisor_url=None,
            yelp_url=yelp_url,
        )

    # Only use parallel execution if google_place_id is provided
    if google_place_id:
        # Parallel mode: Start all tasks simultaneously
        pending_tasks = {}

        yield send_progress("google", "started", "Fetching Google reviews...")
        pending_tasks['google_reviews'] = asyncio.create_task(fetch_google_task())

        yield send_progress("tripadvisor", "started", "Searching for TripAdvisor URL...")
        pending_tasks['tripadvisor_url'] = asyncio.create_task(resolve_tripadvisor_url_task())

        yield send_progress("yelp", "started", "Searching for Yelp URL...")
        pending_tasks['yelp_url'] = asyncio.create_task(resolve_yelp_url_task())

        # Process tasks as they complete
        while pending_tasks:
            done, pending = await asyncio.wait(
                pending_tasks.values(),
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in done:
                task_name = None
                for name_key, t in list(pending_tasks.items()):
                    if t == task:
                        task_name = name_key
                        del pending_tasks[name_key]
                        break

                if not task_name:
                    continue

                try:
                    result = task.result()

                    if task_name == 'google_reviews':
                        google_reviews, google_place_url, google_dataset_urls, google_stats = result

                        if google_place_url:
                            sync_store.upsert_source_place_link(
                                source="google",
                                restaurant_name=name,
                                restaurant_location=location,
                                source_url=google_place_url,
                                source_place_id=google_stats.get("place_id"),
                            )

                        inserted, window = sync_store.upsert_reviews_and_state(
                            source="google",
                            restaurant_name=name.strip(),
                            restaurant_location=location.strip(),
                            rows=[
                                {
                                    "review_key": r.review_key,
                                    "review_date_iso": r.date_iso,
                                    "text": r.text,
                                    "rating": r.rating,
                                    "review_context": r.review_context,
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

                        yield send_progress("google", "completed", f"Found {inserted} new Google reviews")

                    elif task_name == 'tripadvisor_url':
                        tripadvisor_url, _ = result

                        if tripadvisor_url:
                            yield send_progress("tripadvisor", "started", "Fetching TripAdvisor reviews...")
                            pending_tasks['tripadvisor_reviews'] = asyncio.create_task(
                                fetch_tripadvisor_reviews_task(tripadvisor_url)
                            )
                        else:
                            source_stats.append("tripadvisor(skipped:no_resolved_url)")
                            yield send_progress("tripadvisor", "skipped", "No TripAdvisor URL found")

                    elif task_name == 'yelp_url':
                        yelp_url = result

                        if yelp_url:
                            yield send_progress("yelp", "started", "Fetching Yelp reviews...")
                            pending_tasks['yelp_reviews'] = asyncio.create_task(
                                fetch_yelp_reviews_task(yelp_url)
                            )
                        else:
                            source_stats.append("yelp(skipped:no_resolved_url)")
                            yield send_progress("yelp", "skipped", "No Yelp URL found")

                    elif task_name == 'tripadvisor_reviews':
                        reviews, dataset_url, stats = result

                        inserted, window = sync_store.upsert_reviews_and_state(
                            source="tripadvisor",
                            restaurant_name=name.strip(),
                            restaurant_location=location.strip(),
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

                        yield send_progress("tripadvisor", "completed", f"Found {inserted} new TripAdvisor reviews")

                    elif task_name == 'yelp_reviews':
                        reviews, dataset_url, stats = result

                        inserted, window = sync_store.upsert_reviews_and_state(
                            source="yelp",
                            restaurant_name=name.strip(),
                            restaurant_location=location.strip(),
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

                        yield send_progress("yelp", "completed", f"Found {inserted} new Yelp reviews")

                except GoogleReviewsError as e:
                    source_errors.append(f"google: {str(e)}")
                    yield send_progress("google", "failed", str(e))

                except ApifyReviewsError as e:
                    if 'tripadvisor' in task_name:
                        source_errors.append(f"tripadvisor: {str(e)}")
                        yield send_progress("tripadvisor", "failed", str(e))
                    elif 'yelp' in task_name:
                        source_errors.append(f"yelp: {str(e)}")
                        yield send_progress("yelp", "failed", str(e))

                except Exception as e:
                    logger.exception(f"Unexpected error in task {task_name}")
                    if 'google' in task_name:
                        source_errors.append(f"google: {str(e)}")
                        yield send_progress("google", "failed", str(e))
                    elif 'tripadvisor' in task_name:
                        source_errors.append(f"tripadvisor: {str(e)}")
                        yield send_progress("tripadvisor", "failed", str(e))
                    elif 'yelp' in task_name:
                        source_errors.append(f"yelp: {str(e)}")
                        yield send_progress("yelp", "failed", str(e))

    else:
        # Sequential mode: Original behavior when no place_id
        # Stage 1: Google
        yield send_progress("google", "started", "Fetching Google reviews...")

        try:
            google_reviews, google_place_url, google_dataset_urls, google_stats = await fetch_google_task()

            if google_place_url:
                sync_store.upsert_source_place_link(
                    source="google",
                    restaurant_name=name,
                    restaurant_location=location,
                    source_url=google_place_url,
                    source_place_id=google_stats.get("place_id"),
                )

            inserted, window = sync_store.upsert_reviews_and_state(
                source="google",
                restaurant_name=name.strip(),
                restaurant_location=location.strip(),
                rows=[
                    {
                        "review_key": r.review_key,
                        "review_date_iso": r.date_iso,
                        "text": r.text,
                        "rating": r.rating,
                        "review_context": r.review_context,
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

            yield send_progress("google", "completed", f"Found {inserted} new Google reviews")

        except GoogleReviewsError as e:
            source_errors.append(f"google: {str(e)}")
            yield send_progress("google", "failed", str(e))

        # Stage 2: TripAdvisor
        yield send_progress("tripadvisor", "started", "Searching for TripAdvisor URL...")

        tripadvisor_url, _ = await resolve_tripadvisor_url_task()

        if tripadvisor_url:
            yield send_progress("tripadvisor", "started", "Fetching TripAdvisor reviews...")
            try:
                reviews, dataset_url, stats = await fetch_tripadvisor_reviews_task(tripadvisor_url)

                inserted, window = sync_store.upsert_reviews_and_state(
                    source="tripadvisor",
                    restaurant_name=name.strip(),
                    restaurant_location=location.strip(),
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

                yield send_progress("tripadvisor", "completed", f"Found {inserted} new TripAdvisor reviews")

            except ApifyReviewsError as e:
                source_errors.append(f"tripadvisor: {str(e)}")
                yield send_progress("tripadvisor", "failed", str(e))
        else:
            source_stats.append("tripadvisor(skipped:no_resolved_url)")
            yield send_progress("tripadvisor", "skipped", "No TripAdvisor URL found")

        # Stage 3: Yelp
        yield send_progress("yelp", "started", "Searching for Yelp URL...")

        yelp_url = await resolve_yelp_url_task()

        if yelp_url:
            yield send_progress("yelp", "started", "Fetching Yelp reviews...")
            try:
                reviews, dataset_url, stats = await fetch_yelp_reviews_task(yelp_url)

                inserted, window = sync_store.upsert_reviews_and_state(
                    source="yelp",
                    restaurant_name=name.strip(),
                    restaurant_location=location.strip(),
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

                yield send_progress("yelp", "completed", f"Found {inserted} new Yelp reviews")

            except ApifyReviewsError as e:
                source_errors.append(f"yelp: {str(e)}")
                yield send_progress("yelp", "failed", str(e))
        else:
            source_stats.append("yelp(skipped:no_resolved_url)")
            yield send_progress("yelp", "skipped", "No Yelp URL found")

    # Final stage: Generate insights
    yield send_progress("insights", "started", "Generating insights...")

    all_stored_reviews = sync_store.get_all_reviews(
        restaurant_name=name.strip(),
        restaurant_location=location.strip(),
    )
    insights = stub_insights_from_reviews(all_stored_reviews, include_empty=settings.include_empty_reviews)

    # Build final response
    from app.schemas import ReviewItem, AnalyzeResponse

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
            f"{total_new} new reviews saved for '{name.strip()}' ({location.strip()})."
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

    response = AnalyzeResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        restaurant_name=name.strip(),
        restaurant_location=location.strip(),
        insights=insights,
        reviews=review_items,
        detail=detail,
        apify_dataset_url="\n".join(dataset_urls) if dataset_urls else None,
        extracted_range_from=min(range_from_values).isoformat() if range_from_values else None,
        extracted_range_to=max(range_to_values).isoformat() if range_to_values else None,
        new_reviews_count=total_new,
    )

    yield send_progress("insights", "completed", "Analysis complete")

    # Send final result
    import json
    yield f"data: {json.dumps({'stage': 'complete', 'status': 'success', 'result': response.model_dump()})}\n\n"


@router.post("/restaurants/analyze/stream")
def analyze_restaurant_stream_endpoint(body: AnalyzeStreamRequest):
    """Stream analysis progress via SSE."""
    return StreamingResponse(
        analyze_restaurant_stream(body.name, body.location, body.google_place_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
