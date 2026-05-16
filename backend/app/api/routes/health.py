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
    # Show all env var keys that look like API keys or common Railway vars
    all_keys = list(os.environ.keys())
    api_related = [k for k in all_keys if any(
        x in k.upper() for x in ["API", "KEY", "SECRET", "TOKEN", "OPENAI", "GOOGLE", "APIFY", "PORT", "RAILWAY"]
    )]
    return {
        "openai_api_key_set": bool(s.openai_api_key),
        "google_api_key_set": bool(s.google_api_key),
        "apify_api_key_set": bool(s.apify_api_key),
        "raw_openai_env": bool(os.environ.get("OPENAI_API_KEY")),
        "raw_google_env": bool(os.environ.get("GOOGLE_API_KEY")),
        "raw_apify_env": bool(os.environ.get("APIFY_API_KEY")),
        "total_env_vars": len(all_keys),
        "api_related_keys": sorted(api_related),
        "railway_environment": os.environ.get("RAILWAY_ENVIRONMENT_NAME", "unknown"),
        "railway_service": os.environ.get("RAILWAY_SERVICE_NAME", "unknown"),
        "railway_git_branch": os.environ.get("RAILWAY_GIT_BRANCH", "unknown"),
    }
