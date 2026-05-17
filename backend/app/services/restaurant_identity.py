"""Stable restaurant identity for review sync (dedupe across re-runs)."""

from __future__ import annotations

import hashlib
import logging

from app.services.review_sync_store import RestaurantRef, ReviewSyncStore

logger = logging.getLogger(__name__)


def make_restaurant_key(
    name: str,
    location: str,
    google_place_id: str | None = None,
) -> str:
    """Unique key: Google Place ID when known, else hash of normalised name + location."""
    pid = (google_place_id or "").strip()
    if pid:
        return f"gpid:{pid}"
    base = f"{ReviewSyncStore._norm(name)}::{ReviewSyncStore._norm(location)}"
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()[:24]
    return f"nl:{digest}"


def resolve_google_place_id(
    name: str,
    location: str,
    google_place_id: str | None = None,
) -> str | None:
    """Return explicit place id, or resolve via Places Autocomplete (name + location)."""
    pid = (google_place_id or "").strip()
    if pid:
        return pid
    try:
        from app.config import get_settings
        from app.services.google_places_service import GooglePlacesService

        if not get_settings().google_api_key:
            return None
        return GooglePlacesService().resolve_first_place_id_for_restaurant(
            restaurant_name=name.strip(),
            restaurant_location=location.strip(),
        )
    except Exception as e:
        logger.warning("Could not resolve Google place id for %r / %r: %s", name, location, e)
        return None


def prepare_restaurant_identity(
    store: ReviewSyncStore,
    name: str,
    location: str,
    google_place_id: str | None = None,
) -> tuple[RestaurantRef, str | None]:
    """
    Resolve place id when possible, pick stable storage key, merge prior name+location rows.

    Manual form entry without autocomplete still maps to the same DB row as a picked suggestion
    when Google Places can match the venue.
    """
    name = name.strip()
    location = location.strip()
    resolved = resolve_google_place_id(name, location, google_place_id)

    nl_key = make_restaurant_key(name, location, None)
    if resolved:
        key = make_restaurant_key(name, location, resolved)
        if nl_key != key and store.count_reviews(restaurant_key=nl_key) > 0:
            if store.count_reviews(restaurant_key=key) == 0:
                store.relink_restaurant_key(nl_key, key)
            else:
                logger.info(
                    "Both %s and %s have reviews; keeping gpid key for new sync",
                    nl_key,
                    key,
                )
    else:
        key = nl_key

    ref = RestaurantRef(key=key, name=name, location=location)
    store.ensure_restaurant(ref, google_place_id=resolved)
    return ref, resolved
