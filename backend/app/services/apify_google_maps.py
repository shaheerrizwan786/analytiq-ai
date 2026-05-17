"""
Fetch Google Maps place reviews via Apify (compass/crawler-google-places or compatible actor).

Requires APIFY_API_KEY and an Apify plan that can run the chosen actor (paid on Apify).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings
from app.services.apify_runner import call_actor_sync


@dataclass(frozen=True)
class GoogleReviewNormalized:
    source: str  # "google"
    text: str
    rating: float | None  # 1–5 when present
    date_iso: str | None
    review_key: str


class ApifyGoogleMapsError(RuntimeError):
    """Raised when the Apify actor fails or returns unusable data."""


def _build_google_maps_run_input(
    settings: Settings,
    *,
    name: str,
    location: str,
    max_reviews: int,
    since: datetime | None,
) -> dict:
    """Input schema for compass/crawler-google-places (see Apify actor docs).

    Note: actor schema can vary by version. We optionally inject a date filter field
    from settings; if actor rejects unknown fields, caller should retry without it.
    """
    mr = max(1, min(max_reviews, 5000))
    payload: dict = {
        "searchStringsArray": [name.strip()],
        "locationQuery": location.strip(),
        "maxCrawledPlacesPerSearch": 1,
        "language": "en",
        "scrapePlaceDetailPage": True,
        "maxReviews": mr,
        "reviewsSort": "newest",
        "scrapeSocialMediaProfiles": {
            "facebooks": False,
            "instagrams": False,
            "youtubes": False,
            "tiktoks": False,
            "twitters": False,
        },
        "maximumLeadsEnrichmentRecords": 0,
    }
    if settings.apify_try_date_filter and since is not None:
        payload[settings.apify_google_review_start_date_field] = since.date().isoformat()
    return payload


def _iter_place_items(items: list[dict]) -> list[dict]:
    """Actor may duplicate place rows when review count > 5k; merge by title+address if needed. For MVP we flatten all reviews from all items."""
    return items


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    iso = value.strip()
    if iso.endswith("Z"):
        iso = iso[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _make_review_key(*, text: str, date_iso: str | None, rating: float | None) -> str:
    base = f"{text.strip()}|{date_iso or ''}|{'' if rating is None else rating}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _normalize_review_row(raw: dict) -> GoogleReviewNormalized | None:
    text = (raw.get("text") or "").strip()
    if not text:
        return None
    stars = raw.get("stars")
    rating: float | None
    if stars is None:
        rating = None
    else:
        try:
            rating = float(stars)
        except (TypeError, ValueError):
            rating = None
    date_iso = raw.get("publishedAtDate")
    if date_iso is not None and not isinstance(date_iso, str):
        date_iso = str(date_iso)
    return GoogleReviewNormalized(
        source="google",
        text=text,
        rating=rating,
        date_iso=date_iso,
        review_key=_make_review_key(text=text, date_iso=date_iso, rating=rating),
    )


def fetch_google_reviews(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
    since: datetime | None = None,
) -> tuple[list[GoogleReviewNormalized], str | None]:
    """
    Run Apify actor and return normalized Google reviews + optional Apify dataset URL for debugging.

    Args:
        since: incremental boundary; only reviews strictly newer than this timestamp are returned.

    Returns:
        (reviews, dataset_log_url)
    """
    if not settings.apify_api_key:
        raise ApifyGoogleMapsError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)

    run_input = _build_google_maps_run_input(
        settings,
        name=restaurant_name,
        location=restaurant_location,
        max_reviews=settings.apify_max_reviews,
        since=since,
    )

    try:
        run = call_actor_sync(
            client,
            settings.apify_google_actor_id,
            settings=settings,
            profile="google_places_crawl",
            run_input=run_input,
            wait_secs=settings.apify_wait_secs,
        )
    except ApifyApiError as e:
        if settings.apify_try_date_filter and since is not None:
            fallback_input = _build_google_maps_run_input(
                settings,
                name=restaurant_name,
                location=restaurant_location,
                max_reviews=settings.apify_max_reviews,
                since=None,
            )
            try:
                run = call_actor_sync(
                    client,
                    settings.apify_google_actor_id,
                    settings=settings,
                    profile="google_places_crawl",
                    run_input=fallback_input,
                    wait_secs=settings.apify_wait_secs,
                )
            except ApifyApiError as e2:
                raise ApifyGoogleMapsError(str(e2)) from e2
        else:
            raise ApifyGoogleMapsError(str(e)) from e

    if run is None:
        raise ApifyGoogleMapsError("Apify actor run returned no result (run is None)")

    if not run.get("defaultDatasetId"):
        raise ApifyGoogleMapsError("Apify run finished without a default dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    items: list[dict] = []
    for item in client.dataset(dataset_id).iterate_items():
            if isinstance(item, dict):
                items.append(item)

    items = _iter_place_items(items)
    normalized: list[GoogleReviewNormalized] = []
    seen_text: set[str] = set()
    for place in items:
        for raw in place.get("reviews") or []:
            if not isinstance(raw, dict):
                continue
            row = _normalize_review_row(raw)
            if row is None:
                continue
            if row.text in seen_text:
                continue
            if since is not None:
                row_dt = _parse_iso_datetime(row.date_iso)
                if row_dt is None or row_dt <= since:
                    continue
            seen_text.add(row.text)
            normalized.append(row)
            if len(normalized) >= settings.apify_max_reviews:
                break
        if len(normalized) >= settings.apify_max_reviews:
            break

    normalized = normalized[: max(1, settings.apify_max_reviews)]

    return normalized, dataset_url
