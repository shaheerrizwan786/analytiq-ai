import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Loads env from repo root (.env.local then .env) so one file serves frontend + backend."""

    model_config = SettingsConfigDict(
        env_file=(
            _REPO_ROOT / ".env.local",
            _REPO_ROOT / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    cors_origins: str = "http://localhost:3000"
    database_url: str | None = None
    apify_api_key: str | None = None

    # Review actors
    apify_google_actor_id: str = "compass/crawler-google-places"
    apify_google_reviews_actor_id: str = "compass/Google-Maps-Reviews-Scraper"
    apify_yelp_actor_id: str = "voyager/yelp-review-scraper"
    apify_tripadvisor_actor_id: str = "maxcopell/tripadvisor-reviews"

    # Discovery actors (resolve URL from name + location)
    apify_google_search_actor_id: str = "apify/google-search-scraper"
    apify_yelp_discovery_actor_id: str = "tri_angle/yelp-scraper"
    apify_yelp_discovery_search_limit: int = Field(default=3, ge=1, le=20)
    apify_tripadvisor_discovery_actor_id: str = "maxcopell/tripadvisor"

    # Per-source review limits (Google can be thousands; TA/Yelp usually much smaller)
    apify_google_max_reviews: int = Field(default=8, ge=1, le=10000)
    apify_tripadvisor_max_reviews: int = Field(default=5, ge=1, le=2000)
    apify_yelp_max_reviews: int = Field(default=5, ge=1, le=500)
    apify_wait_secs: int = 120

    # Apify Cloud actor memory (MB) — tune per workload size
    apify_memory_google_reviews_mb: int = Field(default=2048, ge=256, le=8192)
    apify_memory_google_places_mb: int = Field(default=1024, ge=256, le=4096)
    apify_memory_tripadvisor_reviews_mb: int = Field(default=768, ge=256, le=4096)
    apify_memory_yelp_reviews_mb: int = Field(default=512, ge=256, le=2048)
    apify_memory_google_search_mb: int = Field(default=256, ge=128, le=1024)
    apify_memory_discovery_mb: int = Field(default=512, ge=256, le=2048)

    # Apify Cloud account memory ceiling (actors run on Apify; Railway only orchestrates API calls)
    apify_platform_memory_budget_mb: int = Field(default=8192, ge=2048, le=32768)
    # Peak overlapping Apify RAM for one analyze; 0 = auto-sum from apify_memory_* settings
    apify_analysis_peak_memory_mb: int = Field(default=0, ge=0, le=16384)

    # Yelp is currently blocked (403 on all requests). Disable to avoid wasted time.
    apify_yelp_enabled: bool = True

    google_api_key: str | None = None
    yelp_api_key: str | None = None
    claude_api_key: str | None = None
    openai_api_key: str | None = None

    # Review processing
    include_empty_reviews: bool = False

    # Internal API key — set to a strong random string in production to protect endpoints
    internal_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # Direct os.environ fallback — pydantic-settings can miss Railway-injected vars
    if not s.openai_api_key:
        s.openai_api_key = (
            os.environ.get("OPENAI_API_KEY")
            or os.environ.get("OPENAI_KEY")
            or None
        )
    if not s.google_api_key:
        s.google_api_key = (
            os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("GOOGLE_MAPS_API_KEY")
            or os.environ.get("GOOGLE_KEY")
            or None
        )
    if not s.apify_api_key:
        s.apify_api_key = (
            os.environ.get("APIFY_API_KEY")
            or os.environ.get("APIFY_TOKEN")
            or os.environ.get("APIFY_KEY")
            or None
        )
    return s
