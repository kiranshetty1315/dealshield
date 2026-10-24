"""Authentication request and response schemas for DealShield AI."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserSignupRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    full_name: Optional[str] = Field("DealShield User", description="User full display name")
    organization: Optional[str] = Field(None, description="User organization")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, description="User full display name")
    organization: Optional[str] = Field(None, description="User organization")
    role: Optional[str] = Field(None, description="User role in the system")


class UserResponse(BaseModel):
    id: str = Field(..., description="User unique UUID")
    email: str = Field(..., description="User email address")
    full_name: str = Field("DealShield User", description="User full display name")
    role: str = Field("Contract Sponsor", description="User role in the system")
    organization: Optional[str] = Field(None, description="User organization")
    created_at: Optional[str] = Field(None, description="ISO timestamp of account creation")


class AuthResponse(BaseModel):
    access_token: str = Field(..., description="Signed Bearer JWT access token")
    token_type: str = Field("bearer", description="Token type")
    user: UserResponse = Field(..., description="Authenticated user object")
