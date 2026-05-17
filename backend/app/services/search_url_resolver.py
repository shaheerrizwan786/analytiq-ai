from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher

from apify_client import ApifyClient, ApifyClientAsync
from apify_client.errors import ApifyApiError

from app.config import Settings
from app.services.apify_async_io import iterate_dataset_items_locked
from app.services.apify_runner import call_actor_async, call_actor_sync

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
        run = call_actor_sync(
            client,
            settings.apify_google_search_actor_id,
            settings=settings,
            profile="google_search",
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


async def _search_with_google_async(settings: Settings, query: str, max_results: int = 10) -> list[dict]:
    """Async Google Search Scraper (ApifyClientAsync); safe to run concurrently on one event loop."""
    if not settings.apify_api_key:
        raise SearchUrlResolverError("APIFY_API_KEY not configured")

    client = ApifyClientAsync(settings.apify_api_key)
    run_input = {
        "queries": query,
        "maxPagesPerQuery": 1,
        "resultsPerPage": max_results,
        "mobileResults": False,
        "languageCode": "en",
        "countryCode": "au",
    }
    try:
        logger.info("Starting Google Search actor (async) for query: %s", query)
        run = await call_actor_async(
            client,
            settings.apify_google_search_actor_id,
            settings=settings,
            profile="google_search",
            run_input=run_input,
            timeout_secs=60,
        )
        if not run or run.get("status") != "SUCCEEDED":
            raise SearchUrlResolverError(
                f"Google Search actor failed: {run.get('status') if run else 'no run'}"
            )
        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            raise SearchUrlResolverError("No dataset returned from Google Search actor")

        items: list[dict] = []
        async for item in iterate_dataset_items_locked(client, dataset_id):
            if isinstance(item, dict):
                items.append(item)
        logger.info("Google Search (async) returned %s dataset rows", len(items))

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


def _sanitise_query_input(s: str) -> str:
    """Strip characters that could manipulate a search query string."""
    return re.sub(r"[^A-Za-z0-9 ,'\-\.]", "", s)


def _remove_duplicate_location_from_name(name: str, location: str) -> tuple[str, str]:
    """
    Remove duplicate location terms that appear in both restaurant name and location.

    Example:
        name: "3 brothersss indian restaurant qvm elizabeth street"
        location: "elizabeth street, melbourne vic, australia"

        Returns: ("3 brothersss indian restaurant qvm", "melbourne vic, australia")

    Algorithm:
    1. Split location by comma and get first segment
    2. Compare last word of name with last word of first location segment (case-insensitive)
    3. If match, remove from both and continue comparing backwards
    4. Return cleaned name and location
    """
    name_words = name.strip().split()
    location_parts = [p.strip() for p in location.split(',') if p.strip()]

    if not name_words or not location_parts:
        return name.strip(), location.strip()

    # Get first segment of location (e.g., "elizabeth street")
    first_location_segment = location_parts[0]
    location_segment_words = first_location_segment.split()

    if not location_segment_words:
        return name.strip(), location.strip()

    # Compare from the end backwards
    name_idx = len(name_words) - 1
    loc_idx = len(location_segment_words) - 1
    matches_found = 0

    while name_idx >= 0 and loc_idx >= 0:
        name_word = name_words[name_idx].lower().strip('.,;!?')
        loc_word = location_segment_words[loc_idx].lower().strip('.,;!?')

        if name_word == loc_word:
            matches_found += 1
            name_idx -= 1
            loc_idx -= 1
        else:
            break

    # If we found matches, remove them
    if matches_found > 0:
        # Remove matched words from name
        cleaned_name_words = name_words[:name_idx + 1]
        cleaned_name = ' '.join(cleaned_name_words).strip()

        # Remove first location segment and reconstruct location
        remaining_location_parts = location_parts[1:]
        cleaned_location = ', '.join(remaining_location_parts).strip()

        logger.info(
            f"Removed duplicate location terms: "
            f"name '{name}' -> '{cleaned_name}', "
            f"location '{location}' -> '{cleaned_location}'"
        )

        return cleaned_name or name.strip(), cleaned_location or location.strip()

    return name.strip(), location.strip()


def resolve_tripadvisor_url_from_search(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None
) -> str | None:
    """
    Search and find the first TripAdvisor URL that contains 'Restaurant_Review'.
    Uses Apify Google Search Scraper.
    """
    if settings is None:
        from app.config import get_settings
        settings = get_settings()

    # Remove duplicate location terms from name and location
    cleaned_name, cleaned_location = _remove_duplicate_location_from_name(
        restaurant_name.strip(),
        restaurant_location.strip()
    )

    # Sanitise inputs for security
    query = f"{_sanitise_query_input(cleaned_name)}, {_sanitise_query_input(cleaned_location)} TripAdvisor"

    try:
        organic_results = _search_with_google(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning(f"Google Search failed for TripAdvisor query '{query}': {e}")
        return None

    if not organic_results:
        logger.warning("TripAdvisor search returned no organicResults for query: %s", query)
        return None

    # Find first URL that contains tripadvisor domain AND Restaurant_Review
    for result in organic_results:
        url = str(result.get("url") or "").strip()
        title = str(result.get("title") or "")

        if not url:
            continue

        url_lower = url.lower()

        # Check if URL contains tripadvisor domain
        if "tripadvisor." not in url_lower:
            continue

        # Check if URL contains Restaurant_Review pattern
        if "restaurant_review" not in url_lower:
            continue

        logger.info("TripAdvisor URL found: title=%s, url=%s", title, url)
        return url

    logger.warning("No valid TripAdvisor Restaurant_Review URL found in search results for query: %s", query)
    return None


def resolve_yelp_url_from_search(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None
) -> str | None:
    """
    Search and find the first Yelp URL that contains '/biz/'.
    Uses Apify Google Search Scraper.
    """
    if settings is None:
        from app.config import get_settings
        settings = get_settings()

    # Remove duplicate location terms from name and location
    cleaned_name, cleaned_location = _remove_duplicate_location_from_name(
        restaurant_name.strip(),
        restaurant_location.strip()
    )

    # Sanitise inputs for security
    query = f"{_sanitise_query_input(cleaned_name)}, {_sanitise_query_input(cleaned_location)} Yelp"

    try:
        organic_results = _search_with_google(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning(f"Google Search failed for Yelp query '{query}': {e}")
        return None

    if not organic_results:
        logger.warning("Yelp search returned no organicResults for query: %s", query)
        return None

    # Find first URL that contains yelp domain AND /biz/
    for result in organic_results:
        url = str(result.get("url") or "").strip()
        title = str(result.get("title") or "")

        if not url:
            continue

        url_lower = url.lower()

        # Check if URL contains yelp domain
        if "yelp." not in url_lower:
            continue

        # Check if URL contains /biz/ path
        if "/biz/" not in url_lower:
            continue

        logger.info("Yelp URL found: title=%s, url=%s", title, url)
        return url

    logger.warning("No valid Yelp /biz/ URL found in search results for query: %s", query)
    return None


async def resolve_tripadvisor_url_from_search_async(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None,
) -> str | None:
    """Async TripAdvisor URL resolution via Google Search actor."""
    if settings is None:
        from app.config import get_settings

        settings = get_settings()

    cleaned_name, cleaned_location = _remove_duplicate_location_from_name(
        restaurant_name.strip(),
        restaurant_location.strip(),
    )
    query = f"{_sanitise_query_input(cleaned_name)}, {_sanitise_query_input(cleaned_location)} TripAdvisor"

    try:
        organic_results = await _search_with_google_async(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning("Google Search (async) failed for TripAdvisor query '%s': %s", query, e)
        return None

    if not organic_results:
        logger.warning("TripAdvisor search (async) returned no organicResults for query: %s", query)
        return None

    for result in organic_results:
        url = str(result.get("url") or "").strip()
        title = str(result.get("title") or "")
        if not url:
            continue
        url_lower = url.lower()
        if "tripadvisor." not in url_lower or "restaurant_review" not in url_lower:
            continue
        logger.info("TripAdvisor URL found (async): title=%s, url=%s", title, url)
        return url

    logger.warning("No valid TripAdvisor Restaurant_Review URL found (async) for query: %s", query)
    return None


async def resolve_yelp_url_from_search_async(
    restaurant_name: str,
    restaurant_location: str,
    settings: Settings | None = None,
) -> str | None:
    """Async Yelp URL resolution via Google Search actor."""
    if settings is None:
        from app.config import get_settings

        settings = get_settings()

    cleaned_name, cleaned_location = _remove_duplicate_location_from_name(
        restaurant_name.strip(),
        restaurant_location.strip(),
    )
    query = f"{_sanitise_query_input(cleaned_name)}, {_sanitise_query_input(cleaned_location)} Yelp"

    try:
        organic_results = await _search_with_google_async(settings, query, max_results=10)
    except SearchUrlResolverError as e:
        logger.warning("Google Search (async) failed for Yelp query '%s': %s", query, e)
        return None

    if not organic_results:
        logger.warning("Yelp search (async) returned no organicResults for query: %s", query)
        return None

    for result in organic_results:
        url = str(result.get("url") or "").strip()
        title = str(result.get("title") or "")
        if not url:
            continue
        url_lower = url.lower()
        if "yelp." not in url_lower or "/biz/" not in url_lower:
            continue
        logger.info("Yelp URL found (async): title=%s, url=%s", title, url)
        return url

    logger.warning("No valid Yelp /biz/ URL found (async) for query: %s", query)
    return None
