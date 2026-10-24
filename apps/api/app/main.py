"""DealShield AI — FastAPI Application Entry Point.

Converts informal business conversations into structured, reviewable agreements.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import (
    health_router,
    chats_router,
    analysis_router,
    agreements_router,
    confirmations_router,
    evidence_router,
    auth_router,
    dashboard_router,
)

logger = logging.getLogger("dealshield.security")

SHIPPED_DEFAULT_SECRET_KEY = "dealshield-auth-secret-key-change-in-production-2026"
SHIPPED_DEFAULT_IP_HASH_SALT = "dealshield-default-dev-salt-change-in-production"
SHIPPED_DEFAULT_ENCRYPTION_KEY = "rUqpl4OBAPgr-k1M_wughKIjIBOWpJn-YTRIEq6f3Wk="


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT != "development":
        if (
            settings.SECRET_KEY == SHIPPED_DEFAULT_SECRET_KEY
            or settings.IP_HASH_SALT == SHIPPED_DEFAULT_IP_HASH_SALT
            or settings.ENCRYPTION_KEY == SHIPPED_DEFAULT_ENCRYPTION_KEY
            or "placeholder" in settings.SUPABASE_URL
            or "placeholder" in settings.SUPABASE_ANON_KEY
        ):
            raise RuntimeError(
                f"Production startup blocked: Default shipped credentials/salts or placeholder Supabase credentials "
                f"detected in non-development environment '{settings.ENVIRONMENT}'. "
                "You must configure production SECRET_KEY, IP_HASH_SALT, ENCRYPTION_KEY, and SUPABASE credentials."
            )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description=(
        "DealShield AI transforms informal business negotiations (such as WhatsApp chats) "
        "into structured, reviewable agreements with conflict detection, two-party confirmation, "
        "and tamper-evident integrity hashing."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health endpoint for simple container / load-balancer probes
app.include_router(health_router)

# Versioned API v1 routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(chats_router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis_router, prefix=settings.API_V1_PREFIX)
app.include_router(agreements_router, prefix=settings.API_V1_PREFIX)
app.include_router(confirmations_router, prefix=settings.API_V1_PREFIX)
app.include_router(evidence_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    """Service metadata and link to documentation."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/health",
    }
