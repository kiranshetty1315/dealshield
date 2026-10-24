"""Database package for DealShield AI."""

from app.db.client import get_supabase_client, LocalMemoryDatabase
from app.db.repository import (
    ConversationRepository,
    AnalysisRepository,
    AgreementRepository,
    ConfirmationRepository,
    AuditRepository,
    EvidenceRepository,
    UserRepository,
)

__all__ = [
    "get_supabase_client",
    "LocalMemoryDatabase",
    "ConversationRepository",
    "AnalysisRepository",
    "AgreementRepository",
    "ConfirmationRepository",
    "AuditRepository",
    "EvidenceRepository",
    "UserRepository",
]
