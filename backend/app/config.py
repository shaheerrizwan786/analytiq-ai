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
    # Default: compass/crawler-google-places (Google Maps; needs Apify subscription & actor access)
    apify_google_actor_id: str = "compass/crawler-google-places"
    # Keep low by default to limit Apify actor cost (raise via APIFY_MAX_REVIEWS in .env.local).
    apify_max_reviews: int = Field(default=8, ge=1, le=5000)
    # Max time to wait for actor run (seconds); Google Maps runs can be slow
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
