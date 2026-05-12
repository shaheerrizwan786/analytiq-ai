"""Shared FastAPI dependencies: API-key verification and rate-limiter instance."""
import logging

from fastapi import Header, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

logger = logging.getLogger(__name__)

# Single shared limiter — imported by main.py (app.state.limiter) and all route modules.
limiter = Limiter(key_func=get_remote_address)


def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """FastAPI dependency that enforces the internal API key when one is configured.

    When ``INTERNAL_API_KEY`` is not set (e.g. local dev), every request is allowed
    through so local development is unaffected.
    """
    settings = get_settings()
    if not settings.internal_api_key:
        return  # no-op: key not configured
    if x_api_key != settings.internal_api_key:
        logger.warning("Rejected request: invalid or missing X-API-Key header")
        raise HTTPException(status_code=403, detail="Forbidden")
