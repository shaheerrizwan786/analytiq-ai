"""TripAdvisor listing URL helpers (all detail-page categories supported by review collectors)."""

from __future__ import annotations

# Hotel, Restaurant, Attraction, Activities (product), Cruise — per Apify actor docs
_TRIPADVISOR_DETAIL_MARKERS = (
    "hotel_review",
    "restaurant_review",
    "attraction_review",
    "attractionproductreview",
    "cruise_review",
)


def is_tripadvisor_detail_page_url(url: str) -> bool:
    """True if URL is a TripAdvisor detail/reviews page (not a search or profile-only link)."""
    u = url.lower()
    return "tripadvisor." in u and any(marker in u for marker in _TRIPADVISOR_DETAIL_MARKERS)
