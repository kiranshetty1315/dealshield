"""DealShield AI — Dashboard Overview and Metrics API Route."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.dashboard import DashboardStats
from app.db.repository import DashboardRepository
from app.api.deps import get_optional_current_user
from app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
dashboard_repo = DashboardRepository()


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get Workspace Dashboard Overview & KPIs",
    description="Aggregates live negotiation counts, legal analyses, mutual confirmations, vault records, and recent negotiations.",
)
async def get_dashboard_stats(
    user_id: Optional[str] = Query(None, description="Optional user UUID filter"),
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> DashboardStats:
    """Returns aggregated negotiation metrics and recent conversations from database."""
    if not current_user and settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view dashboard stats.",
        )

    scoped_user_id = current_user["id"] if current_user else user_id
    stats = dashboard_repo.get_dashboard_stats(user_id=scoped_user_id)
    return DashboardStats(**stats)
