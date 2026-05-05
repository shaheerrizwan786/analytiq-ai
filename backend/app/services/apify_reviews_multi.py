from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings


@dataclass(frozen=True)
class ReviewNormalized:
    source: str
    text: str
    rating: float | None
    date_iso: str | None
    review_key: str


class ApifyReviewsError(RuntimeError):
    """Raised when an Apify actor fails or returns unusable data."""


_SUPPORTED_SOURCES = {"google", "yelp", "tripadvisor"}


def per_source_review_limit(settings: Settings, source: str) -> int:
    """Return the review limit for the given source."""
    if source == "google":
        return settings.apify_google_max_reviews
    if source == "tripadvisor":
        return settings.apify_tripadvisor_max_reviews
    if source == "yelp":
        return settings.apify_yelp_max_reviews
    return 3


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


def _pick_first(d: dict, keys: list[str]) -> Any:
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


def _make_review_key(
    *,
    source: str,
    external_id: str | None,
    text: str,
    date_iso: str | None,
    rating: float | None,
) -> str:
    if external_id:
        base = f"{source}|ext|{external_id}"
    else:
        base = f"{source}|text|{text.strip()}|{date_iso or ''}|{'' if rating is None else rating}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _build_actor_input(
    settings: Settings,
    *,
    source: str,
    name: str,
    location: str,
    since: datetime | None,
    tripadvisor_url: str | None = None,
    yelp_url: str | None = None,
) -> dict:
    limit = per_source_review_limit(settings, source)

    if source == "google":
        return {
            "searchStringsArray": [name.strip()],
            "locationQuery": location.strip(),
            "maxCrawledPlacesPerSearch": 1,
            "language": "en",
            "scrapePlaceDetailPage": True,
            "maxReviews": limit,
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

    if source == "yelp":
        if not yelp_url:
            raise ApifyReviewsError("Yelp URL is required for yelp review actor")
        payload = {
            "startUrls": [{"url": yelp_url.strip()}],
            "maxReviewsPerUrl": limit,
            "language": "",
            "dateTo": datetime.now(timezone.utc).date().isoformat(),
        }
        if since is not None:
            payload["dateFrom"] = since.date().isoformat()
        return payload

    payload = {
        "maxItemsPerQuery": limit,
        "scrapeReviewerInfo": True,
        "reviewRatings": ["ALL_REVIEW_RATINGS"],
        "reviewsLanguages": ["ALL_REVIEW_LANGUAGES"],
    }
    if tripadvisor_url:
        payload["startUrls"] = [{"url": tripadvisor_url.strip()}]
    else:
        payload["query"] = f"{name.strip()} {location.strip()}".strip()
    if since is not None:
        payload["lastReviewDate"] = since.date().isoformat()
    return payload


def _normalize_from_item(source: str, item: dict, include_empty: bool = False) -> list[ReviewNormalized]:
    out: list[ReviewNormalized] = []

    text_direct = _to_str(
        _pick_first(item, ["reviewText", "text", "comment", "content", "body", "review"])
    )
    if text_direct or include_empty:
        rating = _to_float(_pick_first(item, ["rating", "stars", "score", "reviewRating"]))
        date_iso = _to_str(
            _pick_first(
                item,
                ["publishedAtDate", "publishedAt", "publishedDate", "date", "reviewDate", "createdAt"],
            )
        )
        external_id = _to_str(_pick_first(item, ["reviewId", "id", "review_id", "uuid"]))
        out.append(
            ReviewNormalized(
                source=source,
                text=text_direct or "",
                rating=rating,
                date_iso=date_iso,
                review_key=_make_review_key(
                    source=source,
                    external_id=external_id,
                    text=text_direct or "",
                    date_iso=date_iso,
                    rating=rating,
                ),
            )
        )

    nested = item.get("reviews")
    if isinstance(nested, list):
        for raw in nested:
            if not isinstance(raw, dict):
                continue
            text = _to_str(_pick_first(raw, ["reviewText", "text", "comment", "content", "body"]))
            if not text and not include_empty:
                continue
            rating = _to_float(_pick_first(raw, ["rating", "stars", "score", "reviewRating"]))
            date_iso = _to_str(
                _pick_first(
                    raw,
                    ["publishedAtDate", "publishedAt", "publishedDate", "date", "reviewDate", "createdAt"],
                )
            )
            external_id = _to_str(_pick_first(raw, ["reviewId", "id", "review_id", "uuid"]))
            out.append(
                ReviewNormalized(
                    source=source,
                    text=text or "",
                    rating=rating,
                    date_iso=date_iso,
                    review_key=_make_review_key(
                        source=source,
                        external_id=external_id,
                        text=text or "",
                        date_iso=date_iso,
                        rating=rating,
                    ),
                )
            )

    return out


def fetch_reviews_for_source(
    settings: Settings,
    *,
    source: str,
    restaurant_name: str,
    restaurant_location: str,
    since: datetime | None = None,
    tripadvisor_url: str | None = None,
    yelp_url: str | None = None,
) -> tuple[list[ReviewNormalized], str | None, dict[str, int]]:
    if source not in _SUPPORTED_SOURCES:
        raise ApifyReviewsError(f"Unsupported source: {source}")
    if not settings.apify_api_key:
        raise ApifyReviewsError("APIFY_API_KEY is not set")

    actor_id = {
        "google": settings.apify_google_actor_id,
        "yelp": settings.apify_yelp_actor_id,
        "tripadvisor": settings.apify_tripadvisor_actor_id,
    }[source]

    client = ApifyClient(settings.apify_api_key)
    run_input = _build_actor_input(
        settings,
        source=source,
        name=restaurant_name,
        location=restaurant_location,
        since=since,
        tripadvisor_url=tripadvisor_url,
        yelp_url=yelp_url,
    )

    try:
        run = client.actor(actor_id).call(run_input=run_input, wait_secs=settings.apify_wait_secs)
    except ApifyApiError as e:
        raise ApifyReviewsError(str(e)) from e

    if run is None or not run.get("defaultDatasetId"):
        raise ApifyReviewsError("Apify run finished without a default dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    limit = per_source_review_limit(settings, source)
    normalized: list[ReviewNormalized] = []
    seen_keys: set[str] = set()

    raw_items_count = 0
    normalized_total = 0
    after_since_count = 0

    for item in client.dataset(dataset_id).iterate_items():
        if not isinstance(item, dict):
            continue
        raw_items_count += 1
        rows = _normalize_from_item(source, item, include_empty=settings.include_empty_reviews)
        normalized_total += len(rows)
        for row in rows:
            if row.review_key in seen_keys:
                continue
            if since is not None:
                dt = _parse_iso_datetime(row.date_iso)
                if dt is None or dt <= since:
                    continue
            after_since_count += 1
            seen_keys.add(row.review_key)
            normalized.append(row)
            if len(normalized) >= limit:
                break
        if len(normalized) >= limit:
            break

    stats = {
        "raw_items_count": raw_items_count,
        "normalized_count": normalized_total,
        "after_since_count": after_since_count,
        "returned_count": len(normalized[:limit]),
        "limit": limit,
    }

    return normalized[:limit], dataset_url, stats
