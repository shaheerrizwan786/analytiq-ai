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
    apify_yelp_discovery_actor_id: str = "tri_angle/yelp-scraper"
    apify_yelp_discovery_search_limit: int = Field(default=3, ge=1, le=20)
    apify_tripadvisor_discovery_actor_id: str = "maxcopell/tripadvisor"

    # Per-source review limits
    apify_google_max_reviews: int = Field(default=8, ge=1, le=5000)
    apify_tripadvisor_max_reviews: int = Field(default=5, ge=1, le=5000)
    apify_yelp_max_reviews: int = Field(default=5, ge=1, le=5000)
    apify_wait_secs: int = 120

    # Yelp is currently blocked (403 on all requests). Disable to avoid wasted time.
    apify_yelp_enabled: bool = False

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
    return Settings()
