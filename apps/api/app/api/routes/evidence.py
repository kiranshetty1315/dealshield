from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.schemas.evidence import DocumentHashRecord, AuditEventRecord
from app.services.hash_service import HashService
from app.db.repository import AuditRepository, EvidenceRepository

router = APIRouter(prefix="/evidence", tags=["Evidence Vault"])

audit_repo = AuditRepository()
evidence_repo = EvidenceRepository()


class HashVerificationRequest(BaseModel):
    content: str = Field(..., description="Raw text or agreement content to verify")
    expected_hash: str = Field(..., description="Known SHA-256 hexadecimal hash string")


class HashVerificationResponse(BaseModel):
    is_valid: bool
    computed_hash: str
    expected_hash: str
    explanation: str
    limitations_notice: str = (
        "SHA-256 verifies that content has not been tampered with since hashed. "
        "It does NOT independently prove identity, execution, or legal electronic signature under Indian law."
    )


@router.post(
    "/verify",
    response_model=HashVerificationResponse,
    summary="Verify Document Integrity Hash",
    description="Validates that a given text or exported document matches its expected SHA-256 cryptographic digest.",
)
async def verify_document_hash(payload: HashVerificationRequest) -> HashVerificationResponse:
    """Verifies content consistency against an expected SHA-256 hash."""
    computed = HashService.hash_text(payload.content)
    is_valid, explanation = HashService.verify_integrity(payload.content, payload.expected_hash)

    return HashVerificationResponse(
        is_valid=is_valid,
        computed_hash=computed,
        expected_hash=payload.expected_hash,
        explanation=explanation
    )


@router.get(
    "/audit-log/{entity_id}",
    response_model=List[AuditEventRecord],
    summary="Get Tamper-Evident Audit Records",
    description="Retrieve append-only audit trail for an entity from Supabase.",
)
async def get_audit_trail(entity_id: str) -> List[AuditEventRecord]:
    """Retrieve audit events from database."""
    events = audit_repo.get_audit_trail(entity_id)
    return [
        AuditEventRecord(
            id=e["id"],
            entity_type=e["entity_type"],
            entity_id=e["entity_id"],
            action=e["action"],
            actor_id=e.get("actor_id"),
            created_at=e["created_at"],
            metadata=e.get("metadata"),
        )
        for e in events
    ]
