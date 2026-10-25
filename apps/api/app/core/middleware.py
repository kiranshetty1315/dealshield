"""Security & Traffic Management Middlewares for DealShield AI.

Implements:
1. SQL Injection Protection Middleware (intercepts and blocks malicious SQL syntax).
2. Rate Limiting Middleware (sliding-window rate limiter per client IP and tier).
"""

import json
import logging
import re
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings

logger = logging.getLogger("dealshield.security")

# Comprehensive Regular Expressions for SQL Injection Detection
SQL_INJECTION_PATTERNS: List[Tuple[str, re.Pattern]] = [
    (
        "UNION SELECT Injection",
        re.compile(r"\bUNION\s+(ALL\s+)?SELECT\b", re.IGNORECASE),
    ),
    (
        "Boolean-Based SQL Injection",
        re.compile(r"\b(OR|AND)\s+['\"]?(\d+)['\"]?\s*=\s*['\"]?\2['\"]?", re.IGNORECASE),
    ),
    (
        "Tautology String SQL Injection",
        re.compile(r"\b(OR|AND)\s+['\"]([a-zA-Z_]+)['\"]\s*=\s*['\"]\2['\"]", re.IGNORECASE),
    ),
    (
        "Destructive DDL/DML Injection",
        re.compile(
            r";\s*(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT)\s+(TABLE|DATABASE|FROM|INTO)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "Inline SQL Comment Injection",
        re.compile(r"['\"]\s*;\s*--", re.IGNORECASE),
    ),
    (
        "Time-Based Blind SQL Injection",
        re.compile(r"\b(PG_SLEEP|SLEEP|WAITFOR\s+DELAY)\s*\(", re.IGNORECASE),
    ),
    (
        "Information Schema Disclosure",
        re.compile(r"\bFROM\s+INFORMATION_SCHEMA\b", re.IGNORECASE),
    ),
    (
        "Stored Procedure / Command Injection",
        re.compile(r"\b(EXEC|EXECUTE)\s*(\(|XP_CMDSHELL)", re.IGNORECASE),
    ),
    (
        "Benchmark Delay Injection",
        re.compile(r"\bBENCHMARK\s*\(\s*\d+\s*,", re.IGNORECASE),
    ),
]


def detect_sql_injection(value: Any) -> Optional[str]:
    """Recursively inspect strings, dicts, and lists for SQL injection signatures."""
    if isinstance(value, str):
        # Decode URL-encoded representations (e.g. %27, %20)
        decoded = unquote(value)
        for name, pattern in SQL_INJECTION_PATTERNS:
            if pattern.search(decoded):
                return name
    elif isinstance(value, dict):
        for k, v in value.items():
            k_res = detect_sql_injection(k)
            if k_res:
                return k_res
            v_res = detect_sql_injection(v)
            if v_res:
                return v_res
    elif isinstance(value, (list, tuple)):
        for item in value:
            item_res = detect_sql_injection(item)
            if item_res:
                return item_res
    return None


class SQLInjectionProtectionMiddleware(BaseHTTPMiddleware):
    """Inspects query parameters, path parameters, and JSON payloads for SQL injection attacks."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not getattr(settings, "SQL_INJECTION_PROTECTION_ENABLED", True):
            return await call_next(request)

        # 1. Inspect Path Parameters
        path_violation = detect_sql_injection(request.url.path)
        if path_violation:
            logger.warning(
                f"[SECURITY ALERT] SQL Injection blocked in PATH ({path_violation}) from "
                f"{request.client.host if request.client else 'unknown'}: {request.url.path}"
            )
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "Potential SQL injection attack detected in URL path. Request rejected.",
                    "code": "SQL_INJECTION_DETECTED",
                },
            )

        # 2. Inspect Query Parameters
        query_string = request.url.query
        if query_string:
            query_violation = detect_sql_injection(query_string)
            if query_violation:
                logger.warning(
                    f"[SECURITY ALERT] SQL Injection blocked in QUERY STRING ({query_violation}) from "
                    f"{request.client.host if request.client else 'unknown'}: {query_string}"
                )
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": "Potential SQL injection attack detected in query parameter. Request rejected.",
                        "code": "SQL_INJECTION_DETECTED",
                    },
                )

        # 3. Inspect JSON Request Bodies for relevant mutating endpoints
        # Skip chat upload endpoint so raw conversational user transcripts are parsed by chat_parser
        if (
            request.method in ("POST", "PUT", "PATCH")
            and not request.url.path.endswith("/chats/upload")
            and request.headers.get("content-type", "").startswith("application/json")
        ):
            try:
                body_bytes = await request.body()
                if body_bytes:
                    try:
                        parsed_json = json.loads(body_bytes.decode("utf-8"))
                        body_violation = detect_sql_injection(parsed_json)
                        if body_violation:
                            logger.warning(
                                f"[SECURITY ALERT] SQL Injection blocked in JSON BODY ({body_violation}) on "
                                f"{request.url.path}"
                            )
                            return JSONResponse(
                                status_code=400,
                                content={
                                    "detail": "Potential SQL injection attack detected in JSON payload. Request rejected.",
                                    "code": "SQL_INJECTION_DETECTED",
                                },
                            )
                    except json.JSONDecodeError:
                        pass
                # Reset receive so downstream handlers can re-read the body
                async def receive():
                    return {"type": "http.request", "body": body_bytes}

                request._receive = receive
            except Exception as e:
                logger.debug(f"SQL injection body scan skipped: {e}")

        return await call_next(request)


class InMemoryRateLimiter:
    """High-performance sliding-window in-memory rate limiter."""

    def __init__(self):
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def check(
        self,
        client_key: str,
        tier: str,
        max_requests: int,
        window_seconds: float = 60.0,
    ) -> Tuple[bool, int, int]:
        """Check rate limit for client. Returns (is_rate_limited, remaining, retry_after)."""
        now = time.time()

        # Periodic cleanup of expired entries
        if now - self._last_cleanup > 300.0:
            self._cleanup(now, window_seconds)

        history = self._history[(client_key, tier)]
        cutoff = now - window_seconds
        active = [ts for ts in history if ts > cutoff]
        self._history[(client_key, tier)] = active

        if len(active) >= max_requests:
            oldest = active[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return True, 0, retry_after

        active.append(now)
        remaining = max(0, max_requests - len(active))
        return False, remaining, 0

    def _cleanup(self, now: float, window_seconds: float):
        cutoff = now - window_seconds
        keys_to_del = []
        for k, timestamps in self._history.items():
            valid = [ts for ts in timestamps if ts > cutoff]
            if not valid:
                keys_to_del.append(k)
            else:
                self._history[k] = valid
        for k in keys_to_del:
            del self._history[k]
        self._last_cleanup = now

    def reset(self):
        """Reset all rate limiter tracking."""
        self._history.clear()


# Global limiter instance
rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforces tiered rate limits per client IP to prevent abuse, DoS, and credential stuffing."""

    EXEMPT_PREFIXES = (
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
    )

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return await call_next(request)

        path = request.url.path

        # Exempt health probes, root, and documentation endpoints
        if path == "/" or any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return await call_next(request)

        # Allow explicit internal test bypass header if provided in tests
        if request.headers.get("x-bypass-rate-limit") == "dealshield-test-bypass":
            return await call_next(request)

        # Extract client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        # Determine Tier and Limit
        if path.startswith("/api/v1/auth") or "/verify-otp" in path:
            tier = "AUTH"
            max_requests = getattr(settings, "RATE_LIMIT_AUTH_PER_MINUTE", 20)
        elif path.startswith("/api/v1/analysis"):
            tier = "AI"
            max_requests = getattr(settings, "RATE_LIMIT_AI_PER_MINUTE", 30)
        elif path.startswith("/api/v1/chats/upload"):
            tier = "UPLOAD"
            max_requests = getattr(settings, "RATE_LIMIT_UPLOAD_PER_MINUTE", 30)
        else:
            tier = "DEFAULT"
            max_requests = getattr(settings, "RATE_LIMIT_DEFAULT_PER_MINUTE", 120)

        is_limited, remaining, retry_after = rate_limiter.check(
            client_key=client_ip,
            tier=tier,
            max_requests=max_requests,
            window_seconds=60.0,
        )

        if is_limited:
            logger.warning(
                f"[RATE LIMIT] Client {client_ip} exceeded {tier} limit of {max_requests} req/min on {path}. "
                f"Retry after {retry_after}s."
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Rate limit exceeded. Maximum {max_requests} requests per minute allowed for this service tier. "
                        f"Please retry after {retry_after} seconds."
                    ),
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
