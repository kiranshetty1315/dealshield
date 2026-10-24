from app.api.routes.health import router as health_router
from app.api.routes.chats import router as chats_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.agreements import router as agreements_router
from app.api.routes.confirmations import router as confirmations_router
from app.api.routes.evidence import router as evidence_router

__all__ = [
    "health_router",
    "chats_router",
    "analysis_router",
    "agreements_router",
    "confirmations_router",
    "evidence_router",
]
