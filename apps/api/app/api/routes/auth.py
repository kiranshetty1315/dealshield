"""Authentication endpoints for DealShield AI."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Header, status
from app.schemas.auth import (
    UserSignupRequest,
    UserLoginRequest,
    UserUpdateRequest,
    PasswordChangeRequest,
    UserResponse,
    AuthResponse,
)
from app.db.repository import UserRepository, AuditRepository
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: UserSignupRequest):
    """Register a new DealShield account with email and password."""
    clean_email = req.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid email address.",
        )
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long.",
        )

    user_repo = UserRepository()
    existing = user_repo.get_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    pwd_hash = hash_password(req.password)
    user_row = user_repo.create_user(
        email=clean_email,
        password_hash=pwd_hash,
        full_name=req.full_name or "DealShield User",
        organization=req.organization,
        role="Contract Sponsor",
    )

    # Log audit event
    try:
        audit_repo = AuditRepository()
        audit_repo.record_event(
            entity_type="user",
            entity_id=user_row["id"],
            action="user_registered",
            actor_id=user_row["id"],
            metadata={"email": clean_email, "auth_provider": "dealshield_local"},
        )
    except Exception:
        pass

    token = create_access_token(user_row["id"], user_row["email"])
    user_resp = UserResponse(
        id=user_row["id"],
        email=user_row["email"],
        full_name=user_row.get("full_name", "DealShield User"),
        role=user_row.get("role", "Contract Sponsor"),
        organization=user_row.get("organization"),
        created_at=user_row.get("created_at"),
    )
    return AuthResponse(access_token=token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=AuthResponse)
async def login(req: UserLoginRequest):
    """Authenticate with email and password to receive a Bearer session token."""
    clean_email = req.email.strip().lower()
    user_repo = UserRepository()
    user = user_repo.get_by_email(clean_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Password validation
    stored_hash = user.get("password_hash", "")
    is_valid = verify_password(stored_hash, req.password)

    # Demo fallback convenience for demo@dealshield.local
    if not is_valid and clean_email == "demo@dealshield.local" and req.password == "password123":
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Log audit event
    try:
        audit_repo = AuditRepository()
        audit_repo.record_event(
            entity_type="user",
            entity_id=user["id"],
            action="user_logged_in",
            actor_id=user["id"],
            metadata={"email": clean_email},
        )
    except Exception:
        pass

    token = create_access_token(user["id"], user["email"])
    user_resp = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name", "DealShield User"),
        role=user.get("role", "Contract Sponsor"),
        organization=user.get("organization"),
        created_at=user.get("created_at"),
    )
    return AuthResponse(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Retrieve currently authenticated user profile from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization[7:].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    user_repo = UserRepository()
    user = user_repo.get_by_id(payload.get("sub", ""))
    if not user:
        # Fallback by email
        user = user_repo.get_by_email(payload.get("email", ""))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name", "DealShield User"),
        role=user.get("role", "Contract Sponsor"),
        organization=user.get("organization"),
        created_at=user.get("created_at"),
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user(req: UserUpdateRequest, authorization: Optional[str] = Header(None)):
    """Update profile attributes for currently authenticated user in Supabase."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization[7:].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    user_repo = UserRepository()
    user = user_repo.get_by_id(payload.get("sub", ""))
    if not user:
        user = user_repo.get_by_email(payload.get("email", ""))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    updated = user_repo.update_user(
        user_id=user["id"],
        full_name=req.full_name,
        organization=req.organization,
        role=req.role,
    )
    if not updated:
        updated = user_repo.get_by_id(user["id"])

    # Log audit event
    try:
        audit_repo = AuditRepository()
        audit_repo.record_event(
            entity_type="user",
            entity_id=user["id"],
            action="user_profile_updated",
            actor_id=user["id"],
            metadata={
                "updated_fields": [k for k, v in req.model_dump(exclude_unset=True).items() if v is not None]
            },
        )
    except Exception:
        pass

    return UserResponse(
        id=updated["id"],
        email=updated["email"],
        full_name=updated.get("full_name", "DealShield User"),
        role=updated.get("role", "Contract Sponsor"),
        organization=updated.get("organization"),
        created_at=updated.get("created_at"),
    )


@router.post("/change-password")
async def change_password(req: PasswordChangeRequest, authorization: Optional[str] = Header(None)):
    """Change account password in Supabase with current password verification."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization[7:].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    user_repo = UserRepository()
    user = user_repo.get_by_id(payload.get("sub", ""))
    if not user:
        user = user_repo.get_by_email(payload.get("email", ""))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Validate current password
    stored_hash = user.get("password_hash", "")
    is_valid = verify_password(stored_hash, req.current_password)
    if not is_valid and user.get("email") == "demo@dealshield.local" and req.current_password == "password123":
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect.",
        )

    new_hash = hash_password(req.new_password)
    user_repo.update_user(user["id"], password_hash=new_hash)

    # Log audit event
    try:
        audit_repo = AuditRepository()
        audit_repo.record_event(
            entity_type="user",
            entity_id=user["id"],
            action="user_password_changed",
            actor_id=user["id"],
            metadata={"email": user["email"]},
        )
    except Exception:
        pass

    return {"status": "success", "message": "Password updated successfully in database."}


@router.post("/logout")
async def logout():
    """Client-side token session termination acknowledgement."""
    return {"status": "success", "message": "Logged out successfully."}
