from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class PartyConfirmationRecord(BaseModel):
    party_name: str
    party_email: Optional[str] = None
    masked_email: Optional[str] = None
    gst_number: Optional[str] = None
    pan_last_4: Optional[str] = None
    office_address: Optional[str] = None
    verification_method: Optional[str] = None
    email_verified_at: Optional[datetime] = None
    agreed_version_number: Optional[int] = None
    agreed_content_hash: Optional[str] = None
    confirmed: bool = False
    confirmed_at: Optional[datetime] = None
    declined: bool = False
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    notes: Optional[str] = None
    ip_hash: Optional[str] = None


class ConfirmationStatus(BaseModel):
    agreement_id: str
    version_number: int
    parties: List[PartyConfirmationRecord] = Field(default_factory=list)
    all_confirmed: bool = False
    any_declined: bool = False
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ConfirmationRequest(BaseModel):
    agreement_id: str
    version_number: int = Field(1, description="Target agreement version number")
    party_name: str
    confirmed: bool
    action: Optional[str] = "agree"
    decline_reason: Optional[str] = None
    notes: Optional[str] = None


class TokenCreateRequest(BaseModel):
    agreement_id: str = Field(..., description="Target agreement UUID")
    party_name: str = Field(..., description="Counterparty name to issue link for")
    party_email: str = Field(..., description="Counterparty email address for OTP verification")
    hours_valid: int = Field(72, description="Token validity window in hours")
    gst_number: Optional[str] = Field(None, description="Client business GST number")
    pan_last_4: Optional[str] = Field(None, description="Last 4 digits of Business PAN card")
    office_address: Optional[str] = Field(None, description="Office location / address")


class EmailCheckRequest(BaseModel):
    email: str = Field(..., description="Client email address to verify against stored recipient")
    pan_last_4: Optional[str] = Field(None, description="Last 4 digits of Business PAN card")


class OtpVerifyRequest(BaseModel):
    otp: str = Field(..., description="6-digit verification code received by email")


class SessionResponse(BaseModel):
    session_token: str
    expires_at: str


class TokenInspectResponse(BaseModel):
    token: str
    party_name: str
    masked_email: Optional[str] = None
    gst_number: Optional[str] = None
    pan_last_4: Optional[str] = None
    office_address: Optional[str] = None
    has_pan_check: bool = False
    confirmed: bool = False
    confirmed_at: Optional[datetime] = None
    declined: bool = False
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    expires_at: Optional[str] = None
    requires_email_verification: bool = True
    agreement: Optional[Dict[str, Any]] = None
