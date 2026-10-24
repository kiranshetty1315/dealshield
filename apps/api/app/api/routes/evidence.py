from typing import Optional
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel, Field
from app.schemas.evidence import DocumentHashRecord, AuditEventRecord
from app.services.hash_service import HashService

router = APIRouter(prefix="/evidence", tags=["Evidence Vault"])


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
    description="Validates that a given text or exported document matches its expected SHA-256 cryptographic digest."
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
    summary="Get Tamper-Evident Audit Records",
    description="Retrieve append-only audit trail for an entity."
)
async def get_audit_trail(entity_id: str):
    """Retrieve audit events from database."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "error": "NotImplemented",
            "message": "Audit event retrieval is pending Team D Supabase integration.",
            "team_owner": "Team D",
            "assigned_branch": "feature/evidence-vault"
        }
    )
