from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.dependencies import limiter
from app.api.routes import analyze, analyze_stream, chat, health, places
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = get_settings()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Analytiq AI API",
        description="Restaurant feedback intelligence — FastAPI service.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    )

    @app.get("/", tags=["meta"], summary="Service index")
    def root() -> dict[str, str]:
        """Avoid 404 when opening http://127.0.0.1:8000/ in a browser; interactive API is at /docs."""
        return {
            "service": "Analytiq AI API",
            "docs": "/docs",
            "openapi": "/openapi.json",
            "health": "/health",
            "analyze": "POST /api/v1/restaurants/analyze",
        }

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        """Browsers request this automatically; return empty to avoid 404 noise in logs."""
        return Response(status_code=204)

    app.include_router(health.router)
    app.include_router(analyze.router)
    app.include_router(chat.router)
    app.include_router(analyze_stream.router)
    app.include_router(places.router)
    return app


app = create_app()
