"""Unit and integration tests for DealShield AI Security Middlewares.

Verifies:
1. SQL Injection Protection (blocking queries, paths, and JSON bodies containing SQL injection payloads).
2. Rate Limiting (headers, tier thresholds, and HTTP 429 Too Many Requests response).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.middleware import rate_limiter, detect_sql_injection, InMemoryRateLimiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter_state():
    """Reset rate limiter state before each test so tests are isolated."""
    rate_limiter.reset()
    yield
    rate_limiter.reset()


# ============================================================================
# 1. SQL Injection Protection Tests
# ============================================================================

def test_detect_sql_injection_helper():
    """Verify regex pattern detection across classic SQL injection signatures."""
    assert detect_sql_injection("1 UNION SELECT * FROM users") is not None
    assert detect_sql_injection("1' OR '1'='1") is not None
    assert detect_sql_injection("admin' OR 1=1--") is not None
    assert detect_sql_injection("1; DROP TABLE users; --") is not None
    assert detect_sql_injection("1' AND SLEEP(5)--") is not None
    assert detect_sql_injection("SELECT * FROM INFORMATION_SCHEMA.TABLES") is not None
    assert detect_sql_injection("EXEC xp_cmdshell('whoami')") is not None

    # Safe legitimate inputs
    assert detect_sql_injection("Raj Mehta") is None
    assert detect_sql_injection("Website redesign for April") is None
    assert detect_sql_injection("50% upfront payment") is None
    assert detect_sql_injection("c1f7a6b2-0000-0000-0000-000000000001") is None


def test_sql_injection_in_query_params_blocked():
    """Verify requests with SQL injection in query parameters return HTTP 400."""
    response = client.get("/api/v1/analysis?search=1%20UNION%20SELECT%20*%20FROM%20users")
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "SQL_INJECTION_DETECTED"
    assert "SQL injection attack detected" in data["detail"]


def test_sql_injection_boolean_tautology_in_query_blocked():
    """Verify boolean tautology injection (' OR '1'='1) returns HTTP 400."""
    response = client.get("/api/v1/analysis?filter=1%27%20OR%20%271%27=%271")
    assert response.status_code == 400
    assert response.json()["code"] == "SQL_INJECTION_DETECTED"


def test_sql_injection_in_path_parameter_blocked():
    """Verify SQL injection embedded in URL path returns HTTP 400."""
    response = client.get("/api/v1/analysis/1;DROP%20TABLE%20analyses;--")
    assert response.status_code == 400
    assert response.json()["code"] == "SQL_INJECTION_DETECTED"


def test_sql_injection_in_json_body_blocked():
    """Verify malicious SQL injection payloads in JSON request bodies are blocked."""
    payload = {
        "chat_id": "1' UNION SELECT * FROM conversations --",
        "focus_areas": ["pricing"]
    }
    response = client.post("/api/v1/analysis", json=payload)
    assert response.status_code == 400
    assert response.json()["code"] == "SQL_INJECTION_DETECTED"


def test_legitimate_requests_pass_sql_guard():
    """Verify standard legitimate requests pass through the SQL guard without false positives."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ============================================================================
# 2. Rate Limiting Tests
# ============================================================================

def test_rate_limiter_unit_sliding_window():
    """Verify in-memory sliding window limiter correctly decrements and limits."""
    limiter = InMemoryRateLimiter()
    client_key = "192.168.1.100"
    tier = "TEST_TIER"
    max_requests = 3

    # First request
    is_limited, remaining, retry_after = limiter.check(client_key, tier, max_requests, window_seconds=60.0)
    assert is_limited is False
    assert remaining == 2

    # Second request
    is_limited, remaining, retry_after = limiter.check(client_key, tier, max_requests, window_seconds=60.0)
    assert is_limited is False
    assert remaining == 1

    # Third request (hits limit)
    is_limited, remaining, retry_after = limiter.check(client_key, tier, max_requests, window_seconds=60.0)
    assert is_limited is False
    assert remaining == 0

    # Fourth request (exceeds limit)
    is_limited, remaining, retry_after = limiter.check(client_key, tier, max_requests, window_seconds=60.0)
    assert is_limited is True
    assert remaining == 0
    assert retry_after > 0


def test_rate_limit_headers_injected_on_api_requests():
    """Verify X-RateLimit-Limit and X-RateLimit-Remaining headers are present on API responses."""
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code in (200, 401)
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert int(response.headers["X-RateLimit-Remaining"]) >= 0


def test_rate_limit_enforcement_returns_429():
    """Verify client exceeding tier threshold receives HTTP 429 with Retry-After header."""
    # Auth tier has 20 requests per minute limit
    # Send 20 requests
    for i in range(20):
        client.post(
            "/api/v1/auth/login",
            json={"email": f"test_{i}@example.com", "password": "wrongpassword123"},
            headers={"x-forwarded-for": "10.0.0.99"},
        )

    # 21st request should be rate limited
    blocked_response = client.post(
        "/api/v1/auth/login",
        json={"email": "attacker@example.com", "password": "wrongpassword123"},
        headers={"x-forwarded-for": "10.0.0.99"},
    )
    assert blocked_response.status_code == 429
    data = blocked_response.json()
    assert data["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Retry-After" in blocked_response.headers
    assert int(blocked_response.headers["Retry-After"]) >= 1


def test_health_probes_exempt_from_rate_limiting():
    """Verify /health and root probes are exempt from rate limiting for infrastructure monitoring."""
    for _ in range(50):
        res = client.get("/health", headers={"x-forwarded-for": "10.0.0.50"})
        assert res.status_code == 200
