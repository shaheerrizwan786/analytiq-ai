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
    apify_yelp_actor_id: str = "voyager/yelp-review-scraper"
    apify_tripadvisor_actor_id: str = "maxcopell/tripadvisor-reviews"

    # Discovery actors (resolve URL from name + location)
    apify_yelp_discovery_actor_id: str = "tri_angle/yelp-scraper"
    apify_yelp_discovery_search_limit: int = Field(default=3, ge=1, le=20)
    apify_tripadvisor_discovery_actor_id: str = "maxcopell/tripadvisor"

    # Total review budget per request (split across 3 sources)
    apify_max_reviews: int = Field(default=9, ge=3, le=5000)
    apify_wait_secs: int = 900

    google_api_key: str | None = None
    yelp_api_key: str | None = None
    claude_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
