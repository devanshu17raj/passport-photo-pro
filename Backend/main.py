from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import os
import logging

from app.database import engine, Base
from app.routes import photos, presets, history, health
from app.limiter import limiter

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── FIXED: PROTECT AGAINST MULTI-WORKER RACE CONDITION ──────────────────
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        if "already exists" in str(e):
            logger.info("Database tables already initialized by a concurrent worker.")
        else:
            raise
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Passport Photo Pro",
        description="AI-powered passport photo sheet generator — 100% open source, no API keys.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── FIXED: REMOVED TRAILING SLASH AND ADDED DEVELOPMENT FALLBACKS ────────
    # Browsers send origins WITHOUT a trailing slash. Adding "/" causes CORS to fail!
    allowed_origins = [
        "https://passport-photo-pro-dct2.onrender.com",  # Your production frontend
        "http://localhost:5173",                        # Your local Vite preview/dev
        "http://localhost:3000"                         # Alternative local dev port
    ]

    # Also include any custom origins passed via environment variables
    env_origins = os.environ.get("CORS_ORIGINS")
    if env_origins:
        allowed_origins.extend([origin.strip() for origin in env_origins.split(",")])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(presets.router, prefix="/api")
    app.include_router(photos.router, prefix="/api")
    app.include_router(history.router, prefix="/api")

    return app


app = create_app()