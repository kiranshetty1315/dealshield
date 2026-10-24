"""DealShield AI — FastAPI Application Entry Point.

Converts informal business conversations into structured, reviewable agreements.
"""

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
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
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
