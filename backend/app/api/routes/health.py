import os

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/env-check")
def env_check() -> dict:
    """Debug: check which env vars are present (values hidden)."""
    s = get_settings()
    return {
        "openai_api_key_set": bool(s.openai_api_key),
        "google_api_key_set": bool(s.google_api_key),
        "apify_api_key_set": bool(s.apify_api_key),
        "raw_openai_env": bool(os.environ.get("OPENAI_API_KEY")),
        "raw_google_env": bool(os.environ.get("GOOGLE_API_KEY")),
        "raw_apify_env": bool(os.environ.get("APIFY_API_KEY")),
    }
