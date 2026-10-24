from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Normalized chat message with a stable deterministic ID for citation."""
    message_id: str = Field(..., description="Deterministic hash ID (e.g., msg_raj_1018)")
    sender: str = Field(..., description="Sender display name")
    content: str = Field(..., description="Message text content")
    timestamp: datetime = Field(..., description="Message timestamp from chat export")
    sequence_number: int = Field(..., description="Sequential index in conversation (0-based)")
    raw_line: str = Field(..., description="Original raw line from export file")


class ConversationMetadata(BaseModel):
    """High-level summary of parsed conversation."""
    chat_id: str = Field(..., description="Unique conversation UUID")
    filename: str = Field(..., description="Uploaded chat filename")
    party_names: List[str] = Field(default_factory=list, description="Unique participants identified")
    message_count: int = Field(..., description="Total messages parsed")
    uploaded_at: datetime = Field(..., description="Upload timestamp")


class ChatUploadResponse(BaseModel):
    """Response returned upon successful conversation file parsing."""
    chat_id: str
    filename: str
    party_names: List[str]
    message_count: int
    messages: List[Message]
    status: str = Field(default="parsed", description="Status of chat ingestion")
    date_format_inferred: Optional[str] = Field(default="DD/MM/YYYY", description="Inferred date parsing format")
    is_date_ambiguous: bool = Field(default=False, description="Whether all days/months in chat are <= 12")
