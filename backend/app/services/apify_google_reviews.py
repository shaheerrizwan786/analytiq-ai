"""Two-stage Google Maps review extraction with detailed context and ratings.

Stage 1: Use compass/crawler-google-places to get place URL
Stage 2: Use compass/Google-Maps-Reviews-Scraper for detailed reviews
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings


@dataclass(frozen=True)
class GoogleReviewDetailed:
    """Detailed Google review with context and detailed ratings."""

    text: str
    rating: float | None
    date_iso: str | None
    review_key: str
    review_context: dict[str, str] | None
    review_detailed_rating: dict[str, float] | None
    place_id: str | None
    place_url: str | None


class GoogleReviewsError(RuntimeError):
    """Raised when Google reviews extraction fails."""


def _to_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    try:
        return str(value)
    except Exception:  # noqa: BLE001
        return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _make_review_key(
    *,
    external_id: str | None,
    text: str,
    date_iso: str | None,
    rating: float | None,
) -> str:
    """Generate unique review key."""
    if external_id:
        base = f"google|ext|{external_id}"
    else:
        base = f"google|text|{text.strip()}|{date_iso or ''}|{'' if rating is None else rating}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _clean_restaurant_name_for_search(name: str, location: str) -> str:
    """Clean restaurant name by removing location suffixes that may confuse search.

    Examples:
        "Boost Juice Melbourne Central" + "Melbourne" -> "Boost Juice"
        "KFC Clayton" + "Clayton VIC" -> "KFC"
    """
    # Extract city/suburb names from location
    location_parts = [part.strip() for part in location.split(',')]
    location_keywords = set()

    for part in location_parts:
        # Split by spaces and add each word
        words = part.split()
        for word in words:
            # Remove common suffixes like VIC, NSW, Australia
            if word.upper() not in ('VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT', 'AUSTRALIA'):
                location_keywords.add(word.lower())

    # Remove location keywords from restaurant name
    cleaned = name
    for keyword in location_keywords:
        # Remove keyword if it appears at the end (case insensitive)
        pattern = re.compile(rf'\s+{re.escape(keyword)}(\s+\w+)?$', re.IGNORECASE)
        cleaned = pattern.sub('', cleaned).strip()

    # If we removed too much (less than 2 words left), return original
    if len(cleaned.split()) < 2 and len(name.split()) >= 2:
        return name

    return cleaned if cleaned else name


def _extract_place_url_from_crawler(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
) -> tuple[str | None, str | None, str | None]:
    """Stage 1: Extract place URL using crawler-google-places.

    Returns: (place_url, place_id, dataset_url)
    """
    if not settings.apify_api_key:
        raise GoogleReviewsError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)

    # Clean restaurant name to improve search accuracy
    cleaned_name = _clean_restaurant_name_for_search(restaurant_name.strip(), restaurant_location.strip())

    # Extract city from location for broader search
    location_parts = [part.strip() for part in restaurant_location.strip().split(',')]
    # Use city/suburb (usually second part) instead of full address for broader search
    city_location = location_parts[1] if len(location_parts) > 1 else location_parts[0]

    # Try with cleaned name first, using city instead of full address
    run_input = {
        "searchStringsArray": [cleaned_name],
        "locationQuery": city_location.strip(),
        "maxCrawledPlacesPerSearch": 3,  # Increased from 1 to get more candidates
        "language": "en",
        "scrapePlaceDetailPage": False,
        "maxReviews": 0,
        "scrapeSocialMediaProfiles": {
            "facebooks": False,
            "instagrams": False,
            "youtubes": False,
            "tiktoks": False,
            "twitters": False,
        },
        "maximumLeadsEnrichmentRecords": 0,
    }

    try:
        run = client.actor(settings.apify_google_actor_id).call(
            run_input=run_input, wait_secs=settings.apify_wait_secs
        )
    except ApifyApiError as e:
        raise GoogleReviewsError(f"Stage 1 crawler failed: {str(e)}") from e

    if run is None or not run.get("defaultDatasetId"):
        raise GoogleReviewsError("Stage 1 crawler finished without a default dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    place_url = None
    place_id = None

    for item in client.dataset(dataset_id).iterate_items():
        if not isinstance(item, dict):
            continue
        place_url = _to_str(item.get("url"))
        place_id = _to_str(item.get("placeId"))
        if place_url:
            break

    # If no result with cleaned name and names differ, try with original name
    if not place_url and cleaned_name != restaurant_name.strip():
        run_input["searchStringsArray"] = [restaurant_name.strip()]
        run_input["locationQuery"] = city_location.strip()
        try:
            run = client.actor(settings.apify_google_actor_id).call(
                run_input=run_input, wait_secs=settings.apify_wait_secs
            )
            if run and run.get("defaultDatasetId"):
                dataset_id = run["defaultDatasetId"]
                dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"
                for item in client.dataset(dataset_id).iterate_items():
                    if not isinstance(item, dict):
                        continue
                    place_url = _to_str(item.get("url"))
                    place_id = _to_str(item.get("placeId"))
                    if place_url:
                        break
        except ApifyApiError:
            pass  # Keep original error if fallback also fails

    return place_url, place_id, dataset_url


def _extract_detailed_reviews(
    settings: Settings,
    *,
    place_url: str,
    max_reviews: int,
    since: datetime | None = None,
) -> tuple[list[GoogleReviewDetailed], str]:
    """Stage 2: Extract detailed reviews using Google-Maps-Reviews-Scraper.

    Returns: (reviews, dataset_url)
    """
    if not settings.apify_api_key:
        raise GoogleReviewsError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)

    run_input: dict[str, Any] = {
        "maxReviews": max_reviews,
        "personalData": True,
        "reviewsSort": "newest",  # Ensure we get the latest reviews first
        "startUrls": [{"url": place_url}],
    }

    if since is not None:
        run_input["reviewsStartDate"] = since.date().isoformat()

    try:
        run = client.actor(settings.apify_google_reviews_actor_id).call(
            run_input=run_input, wait_secs=settings.apify_wait_secs
        )
    except ApifyApiError as e:
        raise GoogleReviewsError(f"Stage 2 reviews scraper failed: {str(e)}") from e

    if run is None or not run.get("defaultDatasetId"):
        raise GoogleReviewsError("Stage 2 reviews scraper finished without a default dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    reviews: list[GoogleReviewDetailed] = []
    seen_keys: set[str] = set()

    for item in client.dataset(dataset_id).iterate_items():
        if not isinstance(item, dict):
            continue

        text = _to_str(item.get("text") or item.get("textTranslated"))
        if not text and not settings.include_empty_reviews:
            continue

        rating = _to_float(item.get("stars"))
        date_iso = _to_str(item.get("publishedAtDate"))
        review_id = _to_str(item.get("reviewId"))

        # Extract reviewContext
        review_context_raw = item.get("reviewContext")
        review_context = None
        if isinstance(review_context_raw, dict):
            review_context = {k: str(v) for k, v in review_context_raw.items() if v is not None}

        # Extract reviewDetailedRating
        review_detailed_rating_raw = item.get("reviewDetailedRating")
        review_detailed_rating = None
        if isinstance(review_detailed_rating_raw, dict):
            review_detailed_rating = {}
            for k, v in review_detailed_rating_raw.items():
                float_val = _to_float(v)
                if float_val is not None:
                    review_detailed_rating[k] = float_val

        place_id = _to_str(item.get("placeId"))
        place_url_from_item = _to_str(item.get("url"))

        review_key = _make_review_key(
            external_id=review_id,
            text=text or "",
            date_iso=date_iso,
            rating=rating,
        )

        if review_key in seen_keys:
            continue
        seen_keys.add(review_key)

        reviews.append(
            GoogleReviewDetailed(
                text=text or "",
                rating=rating,
                date_iso=date_iso,
                review_key=review_key,
                review_context=review_context if review_context else None,
                review_detailed_rating=review_detailed_rating if review_detailed_rating else None,
                place_id=place_id,
                place_url=place_url_from_item,
            )
        )

        if len(reviews) >= max_reviews:
            break

    return reviews[:max_reviews], dataset_url


def fetch_google_reviews_detailed(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
    since: datetime | None = None,
    cached_place_url: str | None = None,
) -> tuple[list[GoogleReviewDetailed], str | None, str | None, dict[str, int]]:
    """Two-stage Google Maps review extraction.

    Returns: (reviews, place_url, dataset_urls_combined, stats)
    """
    max_reviews = settings.apify_google_max_reviews

    # Stage 1: Get place URL (skip if cached)
    place_url = cached_place_url
    place_id = None
    stage1_dataset_url = None

    if not place_url:
        place_url, place_id, stage1_dataset_url = _extract_place_url_from_crawler(
            settings,
            restaurant_name=restaurant_name,
            restaurant_location=restaurant_location,
        )

        if not place_url:
            raise GoogleReviewsError("Stage 1: Could not find place URL")

    # Stage 2: Extract detailed reviews
    reviews, stage2_dataset_url = _extract_detailed_reviews(
        settings,
        place_url=place_url,
        max_reviews=max_reviews,
        since=since,
    )

    dataset_urls_combined = None
    if stage1_dataset_url and stage2_dataset_url:
        dataset_urls_combined = f"Stage1: {stage1_dataset_url}\nStage2: {stage2_dataset_url}"
    elif stage2_dataset_url:
        dataset_urls_combined = f"Stage2: {stage2_dataset_url}"

    stats = {
        "returned_count": len(reviews),
        "limit": max_reviews,
        "place_url": place_url or "unknown",
        "place_id": place_id or "unknown",
    }

    return reviews, place_url, dataset_urls_combined, stats
