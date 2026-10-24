"""Common API route dependencies and auth utilities."""

from typing import Optional
from fastapi import Header, HTTPException, status
from app.db.repository import UserRepository
from app.core.security import verify_access_token


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Retrieve currently authenticated user profile from Bearer token.
    
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user
