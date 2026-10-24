import re
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.services.email_sender import InMemoryEmailSender
from app.db.repository import (
    ConversationRepository,
    AgreementRepository,
    ConfirmationRepository,
    AuditRepository,
    EvidenceRepository,
)
from app.schemas.chat import Message
from app.services.hash_service import HashService

client = TestClient(app)
DEMO_AUTH_TOKEN = create_access_token("00000000-0000-0000-0000-000000000001", "demo@dealshield.local")
AUTH_HEADERS = {"Authorization": f"Bearer {DEMO_AUTH_TOKEN}"}


def test_conversation_and_message_repository():
    repo = ConversationRepository()
    conv_id = "test_conv_001"
    repo.create_conversation(
        conversation_id=conv_id,
        filename="test-chat.txt",
        party_names=["Raj Mehta", "Priya Sharma"],
        message_count=2,
    )

    conv = repo.get_conversation(conv_id)
    assert conv is not None
    assert conv["filename"] == "test-chat.txt"
    assert "Raj Mehta" in conv["party_names"]

    msgs = [
        Message(
            message_id="msg_raj_001",
            sender="Raj Mehta",
            content="Hello Priya",
            timestamp="2024-03-12T10:15:00Z",
            sequence_number=1,
            raw_line="12/03/24, 10:15 - Raj Mehta: Hello Priya",
        ),
        Message(
            message_id="msg_priya_002",
            sender="Priya Sharma",
            content="Hi Raj",
            timestamp="2024-03-12T10:16:00Z",
            sequence_number=2,
            raw_line="12/03/24, 10:16 - Priya Sharma: Hi Raj",
        ),
    ]
    repo.save_messages(conv_id, msgs)

    # 1. Verify encrypted at rest: raw database storage has ciphertext, not plaintext!
    raw_db_row = repo.client.table("messages").select("*").eq("message_id", "msg_raj_001").execute().data[0]
    assert raw_db_row["content"].startswith("enc:")
    assert "Hello Priya" not in raw_db_row["content"]

    # 2. Verify transparent decryption on read
    stored_msgs = repo.get_messages(conv_id)
    assert len(stored_msgs) == 2
    assert stored_msgs[0]["message_id"] == "msg_raj_001"
    assert stored_msgs[0]["content"] == "Hello Priya"
    assert stored_msgs[1]["message_id"] == "msg_priya_002"
    assert stored_msgs[1]["content"] == "Hi Raj"

    # 3. Test list and delete conversation (DPDP right to erasure)
    chats_list = repo.list_conversations()
    assert any(c["id"] == conv_id for c in chats_list)

    delete_ok = repo.delete_conversation(conv_id)
    assert delete_ok is True
    assert repo.get_conversation(conv_id) is None
    assert len(repo.get_messages(conv_id)) == 0


def test_agreement_generation_and_retrieval():
    # 1. Create draft agreement via route
    res = client.post(
        "/api/v1/agreements",
        json={"analysis_id": "analysis_test_01", "template_type": "service_agreement"},
    )
    assert res.status_code == 201
    agreement_data = res.json()
    agreement_id = agreement_data["id"]
    assert agreement_data["current_version"] == 1
    assert agreement_data["status"] == "draft"
    assert len(agreement_data["versions"]) == 1
    assert len(agreement_data["versions"][0]["clauses"]) == 4

    # 2. Retrieve agreement by ID
    get_res = client.get(f"/api/v1/agreements/{agreement_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == agreement_id

    # 3. Export agreement as Indian Stamp Paper PDF and TXT with SHA-256 header
    export_res = client.get(f"/api/v1/agreements/{agreement_id}/pdf")
    assert export_res.status_code == 200
    assert "X-DealShield-Hash" in export_res.headers
    assert export_res.content.startswith(b"%PDF")
    assert export_res.headers["content-type"] == "application/pdf"

    export_txt = client.get(f"/api/v1/agreements/{agreement_id}/pdf?format=txt")
    assert export_txt.status_code == 200
    assert "DEALSHIELD AI" in export_txt.text


def test_two_party_confirmation_workflow():
    settings.EMAIL_BACKEND = "memory"
    InMemoryEmailSender.clear()

    # Create agreement
    res = client.post(
        "/api/v1/agreements",
        json={"analysis_id": "analysis_conf_01"},
    )
    agreement_id = res.json()["id"]

    # Party 1 (Initiator: Raj Mehta) confirms via direct authenticated route
    conf1_res = client.post(
        "/api/v1/confirmations",
        json={
            "agreement_id": agreement_id,
            "version_number": 1,
            "party_name": "Raj Mehta",
            "confirmed": True,
            "notes": "Agreed to 50k advance.",
        },
        headers=AUTH_HEADERS,
    )
    assert conf1_res.status_code == 200
    data1 = conf1_res.json()
    assert data1["all_confirmed"] is False

    # Check agreement status: partially_confirmed
    ag1 = client.get(f"/api/v1/agreements/{agreement_id}").json()
    assert ag1["status"] == "partially_confirmed"

    # Initiator generates secure link for counterparty Priya Sharma
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
    raw_token = link_res.json()["raw_token"]

    # Priya checks email
    chk_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "priya@example.com"},
    )
    assert chk_res.status_code == 200

    # Dispatch OTP
    send_res = client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    assert send_res.status_code == 200
    assert len(InMemoryEmailSender.outbox) > 0
    otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)

    # Verify OTP and get session token
    v_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": otp},
    )
    assert v_res.status_code == 200
    session_token = v_res.json()["session_token"]

    # Priya confirms using active review session
    conf2_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"notes": "Ready to begin initial mockups.", "action": "agree"},
        headers={"X-Review-Session": session_token},
    )
    assert conf2_res.status_code == 200
    assert conf2_res.json()["status"] == "confirmed"

    # Check agreement status: fully_confirmed
    ag2 = client.get(f"/api/v1/agreements/{agreement_id}").json()
    assert ag2["status"] == "fully_confirmed"


def test_single_use_token_confirmation():
    settings.EMAIL_BACKEND = "memory"
    InMemoryEmailSender.clear()

    conf_repo = ConfirmationRepository()
    agreement_id = "test_ag_tokens_01"
    version_id = "test_ver_01"

    # Create single-use tokens for parties with party_email
    tokens = conf_repo.create_confirmation_tokens(
        agreement_id=agreement_id,
        version_id=version_id,
        party_names=["Counterparty Client"],
        party_email="client@example.com",
    )
    assert len(tokens) == 1
    raw_token = tokens[0]["raw_token"]

    # 1. Verification flow: email check -> OTP -> session
    client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "client@example.com"},
    )
    client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)
    v_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": otp},
    )
    session_token = v_res.json()["session_token"]

    # 2. Execute confirmation with valid token & session
    tok_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"notes": "Confirmed via secure email link"},
        headers={"X-Review-Session": session_token},
    )
    assert tok_res.status_code == 200
    assert tok_res.json()["status"] == "confirmed"

    # 3. Replay attack attempt: same token MUST be rejected
    replay_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"notes": "Trying again"},
        headers={"X-Review-Session": session_token},
    )
    assert replay_res.status_code == 400
    assert "already been executed" in replay_res.json()["detail"]

    # 4. Invalid token rejection
    bad_res = client.post(
        "/api/v1/confirmations/token/invalid-token-xyz",
        headers={"X-Review-Session": session_token},
    )
    assert bad_res.status_code == 400
    assert "Invalid or expired" in bad_res.json()["detail"]


def test_single_use_token_decline_workflow():
    settings.EMAIL_BACKEND = "memory"
    InMemoryEmailSender.clear()

    conf_repo = ConfirmationRepository()
    agreement_id = "test_ag_tokens_decline_01"
    version_id = "test_ver_decline_01"

    tokens = conf_repo.create_confirmation_tokens(
        agreement_id=agreement_id,
        version_id=version_id,
        party_names=["Declining Counterparty"],
        party_email="declining@example.com",
    )
    raw_token = tokens[0]["raw_token"]

    # 1. Inspect token prior to action (no draft revealed without session)
    inspect_res = client.get(f"/api/v1/confirmations/token/{raw_token}")
    assert inspect_res.status_code == 200
    ins_data = inspect_res.json()
    assert ins_data["party_name"] == "Declining Counterparty"
    assert ins_data["confirmed"] is False
    assert ins_data["declined"] is False
    assert ins_data["requires_email_verification"] is True
    assert ins_data["agreement"] is None

    # Complete OTP verification to obtain session
    client.post(
        f"/api/v1/confirmations/token/{raw_token}/email-check",
        json={"email": "declining@example.com"},
    )
    client.post(f"/api/v1/confirmations/token/{raw_token}/otp/send")
    otp = re.search(r"\b(\d{6})\b", InMemoryEmailSender.outbox[-1]["body"]).group(1)
    v_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}/otp/verify",
        json={"otp": otp},
    )
    session_token = v_res.json()["session_token"]

    # 2. Execute decline with reason and valid session
    dec_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={
            "action": "decline",
            "decline_reason": "Payment milestone 50% advance is unacceptable; requesting 25%.",
        },
        headers={"X-Review-Session": session_token},
    )
    assert dec_res.status_code == 200
    res_json = dec_res.json()
    assert res_json["status"] == "declined"
    assert res_json["declined"] is True
    assert "25%" in res_json["decline_reason"]

    # 3. Re-inspect token: reflects declined state
    inspect_res2 = client.get(f"/api/v1/confirmations/token/{raw_token}")
    assert inspect_res2.status_code == 200
    ins_data2 = inspect_res2.json()
    assert ins_data2["declined"] is True
    assert "25%" in ins_data2["decline_reason"]

    # 4. Replay attempt rejected
    replay_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"action": "agree"},
        headers={"X-Review-Session": session_token},
    )
    assert replay_res.status_code == 400
    assert "already been executed" in replay_res.json()["detail"]


def test_audit_events_and_evidence_trail():
    audit_repo = AuditRepository()
    entity_id = "test_audit_entity_123"

    # Log two distinct append-only events
    audit_repo.log_event(
        entity_type="agreement",
        entity_id=entity_id,
        action="version_created",
        metadata={"version": 1},
    )
    audit_repo.log_event(
        entity_type="agreement",
        entity_id=entity_id,
        action="party_confirmed",
        metadata={"party": "Raj Mehta"},
    )

    # Retrieve audit trail via API route
    res = client.get(f"/api/v1/evidence/audit-log/{entity_id}")
    assert res.status_code == 200
    events = res.json()
    assert len(events) == 2
    assert events[0]["action"] == "version_created"
    assert events[1]["action"] == "party_confirmed"
