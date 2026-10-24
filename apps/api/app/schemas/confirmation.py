from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class PartyConfirmationRecord(BaseModel):
    party_name: str
    confirmed: bool = False
    confirmed_at: Optional[datetime] = None
    notes: Optional[str] = None
    ip_hash: Optional[str] = None


class ConfirmationStatus(BaseModel):
    agreement_id: str
    version_number: int
    parties: List[PartyConfirmationRecord] = Field(default_factory=list)
    all_confirmed: bool = False
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ConfirmationRequest(BaseModel):
    agreement_id: str
    version_number: int
    party_name: str
    confirmed: bool
    notes: Optional[str] = None
