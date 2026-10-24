"""Schemas for DealShield AI Dashboard Overview."""

from typing import List, Optional
from pydantic import BaseModel, Field


class DashboardRecentConversation(BaseModel):
    id: str = Field(..., description="Unique conversation UUID")
    filename: str = Field(..., description="Uploaded chat filename or label")
    party_names: List[str] = Field(default_factory=list, description="Extracted negotiating parties")
    message_count: int = Field(0, description="Total parsed messages in chat")
    uploaded_at: str = Field(..., description="ISO 8601 upload timestamp")
    analysis_id: Optional[str] = Field(None, description="Linked legal analysis ID if completed")
    agreement_id: Optional[str] = Field(None, description="Linked agreement contract ID if generated")
    requires_human_review: Optional[bool] = Field(None, description="Flag indicating unresolved conflicts or review needed")
    status: str = Field(..., description="Human-readable negotiation lifecycle status")
    status_variant: str = Field(
        "default",
        description="Badge variant (default, secondary, destructive, outline, warning, success)"
    )


class DashboardStats(BaseModel):
    total_conversations: int = Field(0, description="Total active negotiations / ingested chats")
    total_agreements: int = Field(0, description="Total agreements generated")
    confirmed_agreements: int = Field(0, description="Total fully confirmed agreements")
    pending_review_count: int = Field(0, description="Analyses requiring legal human review")
    total_hashes: int = Field(0, description="Total integrity document fingerprints in vault")
    recent_conversations: List[DashboardRecentConversation] = Field(
        default_factory=list,
        description="Chronological recent conversations with live status"
    )
