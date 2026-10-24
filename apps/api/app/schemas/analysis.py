from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TermStatus(str, Enum):
    AGREED = "agreed"
    PROPOSED = "proposed"
    CONTESTED = "contested"
    AMBIGUOUS = "ambiguous"


class ConflictSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ImportanceLevel(str, Enum):
    CRITICAL = "critical"
    IMPORTANT = "important"
    RECOMMENDED = "recommended"


class Party(BaseModel):
    party_id: str = Field(..., description="Unique ID for party in this chat")
    name: str = Field(..., description="Display name from chat")
    detected_role: Optional[str] = Field(None, description="e.g. Client, Service Provider, Freelancer")
    contact_handle: Optional[str] = Field(None, description="Phone number or chat handle")


class ExtractedTerm(BaseModel):
    term_id: str = Field(..., description="Unique term ID (e.g. term_pricing_01)")
    category: str = Field(..., description="Category: pricing, timeline, scope, payment_terms, deliverables")
    description: str = Field(..., description="Human-readable summary of term")
    proposed_value: Optional[str] = Field(None, description="Initial or counter proposal")
    accepted_value: Optional[str] = Field(None, description="Final agreed value if applicable")
    status: TermStatus = Field(..., description="Status of this term agreement")
    source_message_ids: List[str] = Field(default_factory=list, description="IDs of messages discussing this term")
    confidence: ConfidenceLevel = Field(default=ConfidenceLevel.MEDIUM, description="Confidence in this extraction")


class ConflictItem(BaseModel):
    conflict_id: str = Field(..., description="Unique conflict identifier")
    term_category: str = Field(..., description="Subject category (e.g. pricing, deadline, payment_terms)")
    description: str = Field(..., description="Explanation of contradiction, price mismatch, or qualified acceptance")
    party_positions: Dict[str, str] = Field(default_factory=dict, description="Position held by each party")
    source_message_ids: List[str] = Field(default_factory=list, description="Messages showing disagreement or conditional acceptance")
    severity: ConflictSeverity = Field(default=ConflictSeverity.HIGH)
    resolution_suggestion: Optional[str] = Field(None, description="Plain language proposal to resolve")
    statutory_context: Optional[str] = Field(
        default="Indian Contract Act, 1872 Section 7: Acceptance must be absolute and unqualified.",
        description="Statutory rule framing (e.g. Section 7 qualified acceptance)"
    )


class MissingTerm(BaseModel):
    term_id: str = Field(..., description="Missing item identifier")
    category: str = Field(..., description="Category (e.g. intellectual_property, dispute_resolution)")
    description: str = Field(..., description="What standard legal protection is absent")
    importance: ImportanceLevel = Field(default=ImportanceLevel.IMPORTANT)
    recommendation: str = Field(..., description="Standard recommendation to protect both parties")


class AgreementAnalysis(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis result ID")
    chat_id: str = Field(..., description="ID of source conversation")
    parties: List[Party] = Field(default_factory=list)
    extracted_terms: List[ExtractedTerm] = Field(default_factory=list)
    conflicts: List[ConflictItem] = Field(default_factory=list)
    missing_terms: List[MissingTerm] = Field(default_factory=list)
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall extraction confidence")
    requires_human_review: bool = Field(default=True, description="Flag indicating human lawyer/user review needed")
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalysisRequest(BaseModel):
    chat_id: str = Field(..., description="Conversation ID to analyze")
    focus_areas: Optional[List[str]] = Field(None, description="Specific terms to prioritize")
