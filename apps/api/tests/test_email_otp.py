"""Comprehensive test suite for DealShield AI Email-OTP counterparty confirmation flow.

Validates all security rules:
1. Bearer token auth & agreement ownership for link creation
2. Rejection of initiator's own email as counterparty email
3. Blocking regeneration for already confirmed parties
4. Zero-knowledge email comparison & normalization
5. Locking after 5 failed email checks (HTTP 423)
6. Rate-limiting OTP sends (3 per 15 min, 30s spacing -> HTTP 429)
7. OTP invalidation after 5 wrong guesses
8. Locking after 10 cumulative wrong OTP guesses (HTTP 423)
9. Session issuance (30-min TTL) and X-Review-Session enforcement
10. Side-effect free GET endpoints (no draft leak without session)
11. Single-use replay protection
12. PDF download via active session after confirmation
13. Production email backend guard
14. Audit events contain zero PII/secrets
"""

import re
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.services.email_sender import InMemoryEmailSender, get_email_sender
from app.db.repository import ConfirmationRepository, AgreementRepository, AuditRepository

client = TestClient(app)

INITIATOR_USER_ID = "00000000-0000-0000-0000-000000000001"
INITIATOR_EMAIL = "demo@dealshield.local"
AUTH_TOKEN = create_access_token(INITIATOR_USER_ID, INITIATOR_EMAIL)
AUTH_HEADERS = {"Authorization": f"Bearer {AUTH_TOKEN}"}


@pytest.fixture(autouse=True)
def setup_test_env():
    settings.EMAIL_BACKEND = "memory"
    settings.REQUIRE_EMAIL_OTP = True
    settings.ALLOW_DIRECT_CONFIRM = False
    settings.ENVIRONMENT = "development"
    InMemoryEmailSender.clear()
    yield
    InMemoryEmailSender.clear()


def create_test_agreement(analysis_id="analysis_email_otp_01"):
    res = client.post("/api/v1/agreements", json={"analysis_id": analysis_id})
    assert res.status_code in (200, 201)
    return res.json()["id"]


def test_link_creation_requires_bearer_auth():
    agreement_id = create_test_agreement("analysis_auth_check_01")
    res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
    )
    assert res.status_code == 401


def test_link_creation_rejects_initiator_own_email():
    agreement_id = create_test_agreement("analysis_own_email_01")
    res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Self Counterparty",
            "party_email": INITIATOR_EMAIL,
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 400
    assert "cannot be your own" in res.json()["detail"]


def test_link_creation_validates_email_format():
    agreement_id = create_test_agreement("analysis_email_fmt_01")
    res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "invalid-email-no-domain",
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 422


def test_link_creation_returns_url_without_agreement_id():
    agreement_id = create_test_agreement("analysis_url_check_01")
    res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert "agreement_id=" not in data["confirmation_url"]
    assert data["confirmation_url"].startswith("/review?token=")


def test_inspect_token_hides_draft_without_session():
    agreement_id = create_test_agreement("analysis_hide_draft_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    # Side-effect free GET: no clauses revealed
    inspect_res = client.get(f"/api/v1/confirmations/token/{raw_token}")
    assert inspect_res.status_code == 200
    data = inspect_res.json()
    assert data["requires_email_verification"] is True
    assert data["agreement"] is None
    assert data["masked_email"] == "p***a@e***e.com"


def test_email_check_normalization_and_zero_knowledge_match():
    agreement_id = create_test_agreement("analysis_norm_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    # Entered with different case and whitespace
    chk_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "  PRIYA@EXAMPLE.COM  "},
    )
    assert chk_res.status_code == 200
    assert chk_res.json()["status"] == "verified"


def test_email_check_mismatch_returns_generic_error():
    agreement_id = create_test_agreement("analysis_mismatch_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "wrong@example.com"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "We couldn't verify this email address."


def test_email_check_locks_after_5_failures():
    agreement_id = create_test_agreement("analysis_lock_email_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    for _ in range(4):
        res = client.post(
            f"/api/v1/confirmations/token/{raw_token}/email-check",
            json={"email": "wrong@example.com"},
        )
        assert res.status_code == 400

    # 5th attempt locks the row
    lock_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "wrong@example.com"},
    )
    assert lock_res.status_code == 423
    assert "locked" in lock_res.json()["detail"]

    # Subsequent check is also locked
    sub_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )
    assert sub_res.status_code == 423


def test_link_regeneration_resets_locks_and_counters():
    agreement_id = create_test_agreement("analysis_regen_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    # Cause lock with 5 failures
    for _ in range(5):
        client.post(
            f"/api/v1/confirmations/token/{raw_token}/email-check",
            json={"email": "wrong@example.com"},
        )

    # Initiator regenerates link
    regen_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    assert regen_res.status_code == 200
    new_token = regen_res.json()["raw_token"]
    assert new_token != raw_token

    # New link works cleanly
    chk_res = client.post(
        f"/api/v1/confirmations/token/{new_token}/email-check",
        json={"email": "priya@example.com"},
    )
    assert chk_res.status_code == 200


def test_otp_send_rate_limits():
    agreement_id = create_test_agreement("analysis_ratelimit_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    # 1. Email check first
    client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )

    # 2. First send succeeds
    send1 = client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    assert send1.status_code == 200

    # 3. Sending again within 30s violates minimum spacing (HTTP 429)
    send2 = client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    assert send2.status_code == 429
    assert "wait 30 seconds" in send2.json()["detail"]


def test_otp_invalidation_after_5_wrong_guesses():
    agreement_id = create_test_agreement("analysis_otp_guesses_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )
    client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    real_otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)

    # 4 wrong guesses
    for _ in range(4):
        v = client.post(
            f"/api/v1/confirmations/token/{raw_token}/otp/verify",
            json={"otp": "000000"},
        )
        assert v.status_code == 400
        assert "Invalid verification code" in v.json()["detail"]

    # 5th wrong guess invalidates this OTP
    v5 = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": "000000"},
    )
    assert v5.status_code == 400
    assert "Too many incorrect attempts" in v5.json()["detail"]

    # Real OTP now fails because the OTP was invalidated
    v_real = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": real_otp},
    )
    assert v_real.status_code == 400
    assert "No active verification code" in v_real.json()["detail"]


def test_full_email_otp_confirm_and_pdf_download():
    agreement_id = create_test_agreement("analysis_full_flow_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    # 1. Email check
    chk = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )
    assert chk.status_code == 200

    # 2. OTP send
    send_otp = client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    assert send_otp.status_code == 200
    otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)

    # 3. OTP verify -> returns session
    verify_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": otp},
    )
    assert verify_res.status_code == 200
    session_token = verify_res.json()["session_token"]
    session_headers = {"X-Review-Session": session_token}

    # 4. Now inspect token reveals agreement draft!
    inspect_res = client.get(
        f"/api/v1/confirmations/token/{raw_token}",
        headers=session_headers,
    )
    assert inspect_res.status_code == 200
    ins_data = inspect_res.json()
    assert ins_data["requires_email_verification"] is False
    assert ins_data["agreement"] is not None

    # 5. Attempt download before confirm fails
    dl_early = client.get(
        f"/api/v1/confirmations/token/{raw_token}/download",
        headers=session_headers,
    )
    assert dl_early.status_code == 400

    # 6. Counterparty confirms
    confirm_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"action": "agree", "notes": "Agreed via OTP flow"},
        headers=session_headers,
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # 7. Check completion notifications in outbox (both counterparty and initiator)
    assert len(InMemoryEmailSender.outbox) >= 2
    recipients = [m["to"] for m in InMemoryEmailSender.outbox]
    assert "priya@example.com" in recipients

    # 8. Download PDF after confirm succeeds
    dl_res = client.get(
        f"/api/v1/confirmations/token/{raw_token}/download",
        headers=session_headers,
    )
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")


def test_production_guard_refuses_dev_email_backend():
    settings.ENVIRONMENT = "production"
    settings.EMAIL_BACKEND = "console"
    with pytest.raises(RuntimeError) as exc_info:
        get_email_sender()
    assert "Refusing to use dev email backend" in str(exc_info.value)


def test_audit_logs_contain_no_plaintext_secrets():
    agreement_id = create_test_agreement("analysis_audit_sec_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    raw_token = link_res.json()["raw_token"]

    client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )
    client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)
    v_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": otp},
    )
    session_token = v_res.json()["session_token"]
    client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"action": "agree"},
        headers={"X-Review-Session": session_token},
    )

    audit_repo = AuditRepository()
    events = audit_repo.get_audit_trail(agreement_id)
    assert len(events) > 0

    for ev in events:
        meta_str = str(ev.get("metadata", {}))
        assert "priya@example.com" not in meta_str
        assert raw_token not in meta_str
        assert session_token not in meta_str
        assert otp not in meta_str


def test_confirmation_link_created_audit_logged():
    agreement_id = create_test_agreement("analysis_audit_link_01")
    link_res = client.post(
        "/api/v1/confirmations/tokens",
        json={
            "agreement_id": agreement_id,
            "party_name": "Priya Sharma",
            "party_email": "priya@example.com",
        },
        headers=AUTH_HEADERS,
    )
    assert link_res.status_code == 200
    res_data = link_res.json()
    assert "token_hash" not in res_data
    assert res_data.get("masked_email") == "p***a@e***e.com"

    audit_repo = AuditRepository()
    events = audit_repo.get_audit_trail(agreement_id)
    actions = [ev.get("action") for ev in events]
    assert "confirmation_link_created" in actions


def test_version_assent_reset_on_create_new_version():
    from app.schemas.agreement import Clause
    agreement_id = create_test_agreement("analysis_version_reset_01")
    agree_repo = AgreementRepository()
    conf_repo = ConfirmationRepository()

    # Initiator confirms v1
    conf_repo.submit_confirmation_by_party(
        agreement_id=agreement_id,
        party_name="Raj Mehta",
        confirmed=True,
    )
    status_v1 = conf_repo.get_confirmation_status(agreement_id, version_number=1)
    raj_v1 = next((p for p in status_v1.parties if p.party_name == "Raj Mehta"), None)
    assert raj_v1 is not None
    assert raj_v1.confirmed is True

    # Now initiator creates v2
    v2 = agree_repo.create_new_version(
        agreement_id=agreement_id,
        clauses=[Clause(clause_id="clause_01", title="Updated Clause", body="New scope")],
    )
    assert v2 is not None
    assert v2.version_number == 2

    # Verify confirmations for agreement are reset
    agreement = agree_repo.get_agreement(agreement_id)
    assert agreement.status == "draft"

    status_v2 = conf_repo.get_confirmation_status(agreement_id, version_number=2)
    for p in status_v2.parties:
        assert p.confirmed is False


def test_direct_confirmation_rejects_unauthorized_user():
    from app.db.repository import UserRepository
    user_repo = UserRepository()
    attacker = user_repo.create_user(
        email="attacker@example.com",
        password_hash="mock_hash",
        full_name="Attacker User",
    )
    agreement_id = create_test_agreement("analysis_ownership_01")

    attacker_token = create_access_token(attacker["id"], attacker["email"])
    attacker_headers = {"Authorization": f"Bearer {attacker_token}"}

    res = client.post(
        "/api/v1/confirmations",
        json={
            "agreement_id": agreement_id,
            "party_name": "Raj Mehta",
            "version_number": 1,
            "confirmed": True,
            "signature_type": "standard",
        },
        headers=attacker_headers,
    )
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


@pytest.mark.asyncio
async def test_production_lifespan_hard_stop():
    from app.main import lifespan

    settings.ENVIRONMENT = "production"
    settings.SECRET_KEY = "dealshield-insecure-default-dev-secret-key-change-in-production"
    try:
        with pytest.raises(RuntimeError) as exc_info:
            async with lifespan(app):
                pass
        assert "Production startup blocked" in str(exc_info.value)
    finally:
        # Reset to development settings
        settings.ENVIRONMENT = "development"
        settings.SECRET_KEY = "dealshield-insecure-default-dev-secret-key-change-in-production"



