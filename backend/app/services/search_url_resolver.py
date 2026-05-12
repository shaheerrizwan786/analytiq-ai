from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings

logger = logging.getLogger(__name__)


class SearchUrlResolverError(RuntimeError):
    pass


def _norm_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()



def _search_with_google(settings: Settings, query: str, max_results: int = 10) -> list[dict]:
    """
    Use Apify's Google Search Scraper to find URLs.
    Returns organic results as dicts with url/title/snippet/position.
    """
    if not settings.apify_api_key:
        raise SearchUrlResolverError("APIFY_API_KEY not configured")

    client = ApifyClient(settings.apify_api_key)

    run_input = {
        "queries": query,
        "maxPagesPerQuery": 1,
        "resultsPerPage": max_results,
        "mobileResults": False,
        "languageCode": "en",
        "countryCode": "au",
    }

    try:
        logger.info(f"Starting Google Search actor for query: {query}")
        run = client.actor(settings.apify_google_search_actor_id).call(
            run_input=run_input,
            timeout_secs=60,
        )

        if not run or run.get("status") != "SUCCEEDED":
            raise SearchUrlResolverError(f"Google Search actor failed: {run.get('status') if run else 'no run'}")

        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            raise SearchUrlResolverError("No dataset returned from Google Search actor")

        items = list(client.dataset(dataset_id).iterate_items())
        logger.info(f"Google Search returned {len(items)} results")

        organic: list[dict] = []
        for item in items:
            organic_results = item.get("organicResults", [])
            for result in organic_results:
                if not isinstance(result, dict):
                    continue
                if result.get("url"):
                    organic.append(result)

        return organic

    except ApifyApiError as e:
        raise SearchUrlResolverError(f"Apify API error: {e}") from e
    except Exception as e:
        raise SearchUrlResolverError(f"Google Search failed: {e}") from e


def _extract_location_terms(location: str) -> tuple[str, list[str]]:
    """
    Extract a best-effort city term and normalized location tokens.
    """
    parts = [p.strip() for p in location.split(',') if p.strip()]
    # Prefer suburb/city-like segment (usually near the end, before state/country)
    preferred = ""
    if len(parts) >= 2:
        preferred = parts[-2]
    elif parts:
        preferred = parts[0]

    # Remove obvious state/country suffix words from preferred segment
    preferred = re.sub(r"\b(?:VIC|NSW|QLD|WA|SA|TAS|ACT|NT|AU|AUS|AUSTRALIA)\b", "", preferred, flags=re.IGNORECASE)
    preferred = re.sub(r"\s+", " ", preferred).strip()

    # Tokenize full location for fallback matching (e.g. 'melbourne central', 'clayton')
    tokens = [t for t in _norm_text(location).split() if len(t) >= 3]

    city = preferred.split()[0] if preferred else (tokens[0] if tokens else "")
    return city, tokens


def _clean_restaurant_name(name: str, location: str) -> str:
    """
    Clean restaurant name by removing location suffixes.
    E.g., "Boost Juice Melbourne Central" -> "Boost Juice"
    """
    city, location_tokens = _extract_location_terms(location)

    cleaned = name.strip()

    # Remove location-like suffix tokens from the end of restaurant name
    if location_tokens:
        pattern = re.compile(rf"\s+(?:{'|'.join(map(re.escape, location_tokens[:4]))})(?:\s+\w+)?$", re.IGNORECASE)
        cleaned = pattern.sub("", cleaned).strip()

    # Fallback: remove city term if it appears as suffix
    if city:
        pattern = re.compile(rf"\s+{re.escape(city)}(?:\s+\w+)?$", re.IGNORECASE)
        cleaned = pattern.sub("", cleaned).strip()

    return cleaned or name.strip()


def resolve_tripadvisor_url_from_search(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None
) -> str | None:
    """
    Search with a single natural-language query and pick organic result at position=1
    if it matches TripAdvisor Restaurant_Review URL format.
    """
    if settings is None:
        from app.config import get_settings
        settings = get_settings()

    query = f"{restaurant_name.strip()}, {restaurant_location.strip()} TripAdvisor"

    try:
        organic_results = _search_with_google(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning(f"Google Search failed for TripAdvisor query '{query}': {e}")
        return None


def resolve_yelp_url_from_search(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None
) -> str | None:
    """
    Search with a single natural-language query and pick organic result at position=1
    if it matches Yelp business URL pattern.
    """
    if settings is None:
        from app.config import get_settings
        settings = get_settings()

    query = f"{restaurant_name.strip()}, {restaurant_location.strip()} Yelp"

    try:
        organic_results = _search_with_google(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning(f"Google Search failed for Yelp query '{query}': {e}")
        return None

    if not organic_results:
        logger.warning("Yelp search returned no organicResults for query: %s", query)
        return None

    top1 = next((r for r in organic_results if int(r.get("position", 9999)) == 1), None)
    if not top1:
        top1 = organic_results[0]

    url = str(top1.get("url") or "").strip()
    title = str(top1.get("title") or "")

    has_yelp_domain = "yelp." in url.lower()
    has_biz_token = "/biz/" in url.lower()

    if url and has_yelp_domain and has_biz_token:
        logger.info("Yelp top organic result accepted: title=%s, url=%s", title, url)
        return url

    logger.warning(
        "Yelp top organic result rejected (must contain yelp. + /biz/). title=%s, url=%s",
        title,
        url,
    )
    return None

    if not organic_results:
        logger.warning("TripAdvisor search returned no organicResults for query: %s", query)
        return None

    restaurant_review_pattern = re.compile(r'tripadvisor\.[^/]+/.*/Restaurant_Review-g\d+', re.IGNORECASE)

    top1 = next((r for r in organic_results if int(r.get("position", 9999)) == 1), None)
    if not top1:
        top1 = organic_results[0]

    url = str(top1.get("url") or "").strip()
    title = str(top1.get("title") or "")

    has_tripadvisor_domain = "tripadvisor." in url.lower()
    has_restaurant_review_token = "Restaurant_Review-" in url

    if url and has_tripadvisor_domain and has_restaurant_review_token and restaurant_review_pattern.search(url):
        logger.info("TripAdvisor top organic result accepted: title=%s, url=%s", title, url)
        return url

    logger.warning(
        "TripAdvisor top organic result rejected (must contain tripadvisor domain + Restaurant_Review-). title=%s, url=%s",
        title,
        url,
    )
    return None


