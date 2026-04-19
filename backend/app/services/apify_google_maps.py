"""
Fetch Google Maps place reviews via Apify (compass/crawler-google-places or compatible actor).

Requires APIFY_API_KEY and an Apify plan that can run the chosen actor (paid on Apify).
"""

from __future__ import annotations

from dataclasses import dataclass
from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings


@dataclass(frozen=True)
class GoogleReviewNormalized:
    source: str  # "google"
    text: str
    rating: float | None  # 1–5 when present
    date_iso: str | None


class ApifyGoogleMapsError(RuntimeError):
    """Raised when the Apify actor fails or returns unusable data."""


def _build_google_maps_run_input(name: str, location: str, max_reviews: int) -> dict:
    """Input schema for compass/crawler-google-places (see Apify actor docs)."""
    # Request only what we need; actor billing scales with work (places + reviews).
    mr = max(1, min(max_reviews, 5000))
    return {
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


def _iter_place_items(items: list[dict]) -> list[dict]:
    """Actor may duplicate place rows when review count > 5k; merge by title+address if needed. For MVP we flatten all reviews from all items."""
    return items


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
    )


def fetch_google_reviews(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
) -> tuple[list[GoogleReviewNormalized], str | None]:
    """
    Run Apify actor and return normalized Google reviews + optional Apify dataset URL for debugging.

    Returns:
        (reviews, dataset_log_url)
    """
    if not settings.apify_api_key:
        raise ApifyGoogleMapsError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)
    run_input = _build_google_maps_run_input(
        restaurant_name,
        restaurant_location,
        settings.apify_max_reviews,
    )

    try:
        run = client.actor(settings.apify_google_actor_id).call(
            run_input=run_input,
            wait_secs=settings.apify_wait_secs,
        )
    except ApifyApiError as e:
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
            # Dedupe identical text (duplicate place rows)
            if row.text in seen_text:
                continue
            seen_text.add(row.text)
            normalized.append(row)
            if len(normalized) >= settings.apify_max_reviews:
                break
        if len(normalized) >= settings.apify_max_reviews:
            break

    normalized = normalized[: max(1, settings.apify_max_reviews)]

    return normalized, dataset_url
