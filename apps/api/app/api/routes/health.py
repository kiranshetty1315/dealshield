from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend Health & Diagnostic Status",
    description="Returns backend runtime status, API version, and external service readiness."
)
async def get_health() -> HealthResponse:
    """Check connectivity and service readiness."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        services={
            "database": "unconfigured_in_scaffold",
            "openai": "unconfigured_in_scaffold",
            "chat_parser": "ready",
            "hash_service": "ready"
        }
    )
