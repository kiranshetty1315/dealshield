from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class DocumentHashRecord(BaseModel):
    document_id: str = Field(..., description="Entity UUID being fingerprinted")
    document_type: str = Field(..., description="e.g. agreement_version, conversation_raw, pdf_export")
    hash_algorithm: str = Field(default="sha256")
    hash_value: str = Field(..., description="Hexadecimal SHA-256 digest")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    limitations_notice: str = Field(
        default="SHA-256 provides integrity verification against a trusted record. It does NOT independently verify party identity or legal signature compliance.",
        description="Legal and technical disclaimer"
    )


class AuditEventRecord(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[Dict[str, Any]] = None
