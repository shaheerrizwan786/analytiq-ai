"""Apify actor memory profiles (Apify Cloud ``memoryMbytes`` per run)."""

from __future__ import annotations

from typing import Literal

from app.config import Settings

MemoryProfile = Literal[
    "google_search",
    "google_places_crawl",
    "google_maps_reviews",
    "tripadvisor_reviews",
    "yelp_reviews",
    "discovery",
]


def memory_mbytes_for(settings: Settings, profile: MemoryProfile) -> int:
    """Map workload shape to Apify Cloud ``memoryMbytes`` (runs on Apify, not Railway)."""
    table: dict[MemoryProfile, int] = {
        "google_search": settings.apify_memory_google_search_mb,
        "google_places_crawl": settings.apify_memory_google_places_mb,
        "google_maps_reviews": settings.apify_memory_google_reviews_mb,
        "tripadvisor_reviews": settings.apify_memory_tripadvisor_reviews_mb,
        "yelp_reviews": settings.apify_memory_yelp_reviews_mb,
        "discovery": settings.apify_memory_discovery_mb,
    }
    return table[profile]


def memory_for_review_source(settings: Settings, source: str) -> int:
    if source == "google":
        return memory_mbytes_for(settings, "google_maps_reviews")
    if source == "tripadvisor":
        return memory_mbytes_for(settings, "tripadvisor_reviews")
    if source == "yelp":
        return memory_mbytes_for(settings, "yelp_reviews")
    return memory_mbytes_for(settings, "discovery")
