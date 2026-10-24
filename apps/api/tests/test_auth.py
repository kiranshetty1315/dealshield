"""Unit and integration tests for DealShield authentication routes."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_default_demo_login_success():
    """Verify demo user can log in with standard credentials."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@dealshield.local", "password": "password123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "demo@dealshield.local"
    assert data["user"]["full_name"] == "Demo User"


def test_login_invalid_password_fails():
    """Verify login with incorrect password returns 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@dealshield.local", "password": "wrongpassword!"},
    )
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.json()["detail"]


def test_login_unknown_user_fails():
    """Verify login with non-existent email returns 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_user_999@dealshield.local", "password": "somepassword"},
    )
    assert resp.status_code == 401


def test_signup_and_login_flow():
    """Verify new user can register and then log in successfully."""
    signup_email = "advocate.sharma@dealshield.local"
    signup_payload = {
        "email": signup_email,
        "password": "strongPassword#2026",
        "full_name": "Advocate Priya Sharma",
        "organization": "Sharma & Associates Legal",
    }
    signup_resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_resp.status_code == 201
    signup_data = signup_resp.json()
    assert "access_token" in signup_data
    assert signup_data["user"]["email"] == signup_email
    assert signup_data["user"]["full_name"] == "Advocate Priya Sharma"

    # Now verify login with the new credentials
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": signup_email, "password": "strongPassword#2026"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # Test /api/v1/auth/me with Bearer token
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == signup_email
    assert me_data["full_name"] == "Advocate Priya Sharma"

    # Test updating user profile via PUT /api/v1/auth/me
    update_resp = client.put(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Senior Advocate Priya Sharma",
            "organization": "Supreme Court Legal Chambers",
            "role": "General Counsel",
        },
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["full_name"] == "Senior Advocate Priya Sharma"
    assert updated_data["organization"] == "Supreme Court Legal Chambers"
    assert updated_data["role"] == "General Counsel"

    # Test changing password via POST /api/v1/auth/change-password
    change_resp = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "strongPassword#2026",
            "new_password": "newSecurePassword#2027",
        },
    )
    assert change_resp.status_code == 200
    assert change_resp.json()["status"] == "success"

    # Verify login with the updated password
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": signup_email, "password": "newSecurePassword#2027"},
    )
    assert new_login.status_code == 200


def test_signup_duplicate_email_fails():
    """Verify signing up with an already registered email returns 400."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "demo@dealshield.local",
            "password": "anotherpassword123",
            "full_name": "Duplicate Tester",
        },
    )
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


def test_signup_invalid_email_format():
    """Verify signing up with malformed email returns 422."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "not-a-valid-email",
            "password": "password123",
            "full_name": "Bad Email Tester",
        },
    )
    assert resp.status_code == 422
