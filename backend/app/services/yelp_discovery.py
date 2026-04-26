from __future__ import annotations

import re

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings


class YelpDiscoveryError(RuntimeError):
    pass


def _norm_text(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _token_set(s: str | None) -> set[str]:
    return set(_norm_text(s).split())


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _extract_url(item: dict) -> tuple[str | None, str | None]:
    for key in ("url", "businessUrl", "business_url", "link", "businessLink"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            place_id = item.get("id") or item.get("businessId")
            return value.strip(), str(place_id) if place_id is not None else None
    return None, None


def _score_candidate(item: dict, *, restaurant_name: str, restaurant_location: str) -> float:
    target_name_tokens = _token_set(restaurant_name)
    target_loc_tokens = _token_set(restaurant_location)

    cand_name = item.get("businessName") or item.get("name")
    cand_addr = item.get("address") or item.get("location") or item.get("fullAddress")

    score_name = _jaccard(target_name_tokens, _token_set(str(cand_name) if cand_name else ""))
    score_loc = _jaccard(target_loc_tokens, _token_set(str(cand_addr) if cand_addr else ""))

    # Name is more important than address in matching.
    return (score_name * 0.75) + (score_loc * 0.25)


def discover_yelp_business_url(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
) -> tuple[str | None, str | None, str | None]:
    """Discover Yelp business URL from restaurant name + location.

    Returns:
        (business_url, business_id, dataset_url)
    """
    if not settings.apify_api_key:
        raise YelpDiscoveryError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)

    run_input = {
        "searchTerms": [restaurant_name.strip()],
        "locations": [restaurant_location.strip()],
        "searchLimit": settings.apify_yelp_discovery_search_limit,
        "maxImages": 0,
    }

    try:
        run = client.actor(settings.apify_yelp_discovery_actor_id).call(
            run_input=run_input,
            wait_secs=settings.apify_wait_secs,
        )
    except ApifyApiError as e:
        raise YelpDiscoveryError(str(e)) from e

    if run is None or not run.get("defaultDatasetId"):
        raise YelpDiscoveryError("Yelp discovery run did not return a dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    best: tuple[float, str | None, str | None] = (0.0, None, None)
    for item in client.dataset(dataset_id).iterate_items():
        if not isinstance(item, dict):
            continue
        url, place_id = _extract_url(item)
        if not url:
            continue
        score = _score_candidate(
            item,
            restaurant_name=restaurant_name,
            restaurant_location=restaurant_location,
        )
        if score > best[0]:
            best = (score, url, place_id)

    # Require a minimum confidence to avoid wrong restaurant links.
    if best[1] and best[0] >= 0.35:
        return best[1], best[2], dataset_url

    return None, None, dataset_url
