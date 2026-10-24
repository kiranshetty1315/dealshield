from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Application status")
    version: str = Field(..., description="API version")
    environment: str = Field(..., description="Runtime environment")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current server time (UTC)"
    )
    services: dict[str, str] = Field(
        default_factory=lambda: {
            "database": "unconfigured_in_scaffold",
            "openai": "unconfigured_in_scaffold",
            "chat_parser": "ready"
        },
        description="Status of connected external services"
    )
