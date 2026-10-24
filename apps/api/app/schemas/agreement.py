from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AgreementStatus(str, Enum):
    DRAFT = "draft"
    PENDING_CONFIRMATION = "pending_confirmation"
    PARTIALLY_CONFIRMED = "partially_confirmed"
    FULLY_CONFIRMED = "fully_confirmed"
    SUPERSEDED = "superseded"
    DECLINED = "declined"


class Clause(BaseModel):
    clause_id: str = Field(..., description="Unique clause identifier")
    title: str = Field(..., description="Section title (e.g. Scope of Work, Consideration)")
    body: str = Field(..., description="Plain-language legally coherent clause text")
    source_term_ids: List[str] = Field(default_factory=list, description="IDs of extracted terms synthesized into clause")
    statutory_reference: Optional[str] = Field(None, description="Optional statutory context (e.g. Indian Contract Act, 1872 Sec 10)")


class AgreementVersion(BaseModel):
    id: Optional[str] = Field(None, description="Agreement version UUID")
    version_id: Optional[str] = Field(None, description="Agreement version UUID alias")
    version_number: int = Field(..., ge=1)
    clauses: List[Clause] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: AgreementStatus = Field(default=AgreementStatus.DRAFT)
    content_hash: Optional[str] = Field(None, description="SHA-256 hash of plain text agreement")


class Agreement(BaseModel):
    id: str = Field(..., description="Agreement UUID")
    analysis_id: str = Field(..., description="Source analysis reference")
    parties: List[str] = Field(default_factory=list)
    current_version: int = Field(default=1)
    status: AgreementStatus = Field(default=AgreementStatus.DRAFT)
    versions: List[AgreementVersion] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgreementCreateRequest(BaseModel):
    analysis_id: str = Field(..., description="Analysis ID to generate agreement from")
    template_type: str = Field(default="service_agreement", description="Template to base agreement on")
    parties: Optional[List[str]] = Field(default=None, description="Optional contracting party names override")
