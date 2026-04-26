from __future__ import annotations

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.config import Settings


class TripAdvisorDiscoveryError(RuntimeError):
    pass


def discover_tripadvisor_place_url(
    settings: Settings,
    *,
    restaurant_name: str,
    restaurant_location: str,
) -> tuple[str | None, str | None, str | None]:
    """Discover TripAdvisor place URL from restaurant name + location.

    Returns:
        (place_url, place_id, dataset_url)
    """
    if not settings.apify_api_key:
        raise TripAdvisorDiscoveryError("APIFY_API_KEY is not set")

    client = ApifyClient(settings.apify_api_key)
    query = f"{restaurant_name.strip()} {restaurant_location.strip()}".strip()
    run_input = {
        "query": query,
        "includeRestaurants": True,
        "includeHotels": False,
        "includeAttractions": False,
        "includeNearbyResults": False,
        "maxItemsPerQuery": 5,
        "maxPhotosPerPlace": 0,
        "language": "en",
        "currency": "USD",
    }

    try:
        run = client.actor(settings.apify_tripadvisor_discovery_actor_id).call(
            run_input=run_input,
            wait_secs=settings.apify_wait_secs,
        )
    except ApifyApiError as e:
        raise TripAdvisorDiscoveryError(str(e)) from e

    if run is None or not run.get("defaultDatasetId"):
        raise TripAdvisorDiscoveryError("TripAdvisor discovery run did not return a dataset")

    dataset_id = run["defaultDatasetId"]
    dataset_url = f"https://console.apify.com/storage/datasets/{dataset_id}"

    for item in client.dataset(dataset_id).iterate_items():
        if not isinstance(item, dict):
            continue
        category = str(item.get("category") or "").lower()
        ptype = str(item.get("type") or "").upper()
        web_url = item.get("webUrl")
        place_id = item.get("id")
        if not isinstance(web_url, str) or not web_url.strip():
            continue
        # Prefer explicit restaurant records.
        if category == "restaurant" or ptype == "RESTAURANT":
            return web_url.strip(), str(place_id) if place_id is not None else None, dataset_url

    return None, None, dataset_url
