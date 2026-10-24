"""DealShield AI — Dashboard Overview and Metrics API Route."""

from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.dashboard import DashboardStats
from app.db.repository import DashboardRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
dashboard_repo = DashboardRepository()


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get Workspace Dashboard Overview & KPIs",
    description="Aggregates live negotiation counts, legal analyses, mutual confirmations, vault records, and recent negotiations.",
)
async def get_dashboard_stats(
    user_id: Optional[str] = Query(None, description="Optional user UUID filter")
) -> DashboardStats:
    """Returns aggregated negotiation metrics and recent conversations from database."""
    stats = dashboard_repo.get_dashboard_stats(user_id=user_id)
    return DashboardStats(**stats)
