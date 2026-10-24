import pytest
from fastapi.testclient import TestClient
from app.main import app
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

    # 3. Export agreement as document with SHA-256 header
    export_res = client.get(f"/api/v1/agreements/{agreement_id}/pdf")
    assert export_res.status_code == 200
    assert "X-DealShield-Hash" in export_res.headers
    assert "DEALSHIELD AI" in export_res.text


def test_two_party_confirmation_workflow():
    # Create agreement
    res = client.post(
        "/api/v1/agreements",
        json={"analysis_id": "analysis_conf_01"},
    )
    agreement_id = res.json()["id"]

    # Party 1 confirms
    conf1_res = client.post(
        "/api/v1/confirmations",
        json={
            "agreement_id": agreement_id,
            "version_number": 1,
            "party_name": "Raj Mehta",
            "confirmed": True,
            "notes": "Agreed to 50k advance.",
        },
    )
    assert conf1_res.status_code == 200
    data1 = conf1_res.json()
    assert data1["all_confirmed"] is False

    # Check agreement status: partially_confirmed
    ag1 = client.get(f"/api/v1/agreements/{agreement_id}").json()
    assert ag1["status"] == "partially_confirmed"

    # Party 2 confirms
    conf2_res = client.post(
        "/api/v1/confirmations",
        json={
            "agreement_id": agreement_id,
            "version_number": 1,
            "party_name": "Priya Sharma",
            "confirmed": True,
            "notes": "Ready to begin initial mockups.",
        },
    )
    assert conf2_res.status_code == 200
    data2 = conf2_res.json()
    assert data2["all_confirmed"] is True

    # Check agreement status: fully_confirmed
    ag2 = client.get(f"/api/v1/agreements/{agreement_id}").json()
    assert ag2["status"] == "fully_confirmed"


def test_single_use_token_confirmation():
    conf_repo = ConfirmationRepository()
    agreement_id = "test_ag_tokens_01"
    version_id = "test_ver_01"

    # Create single-use tokens for parties
    tokens = conf_repo.create_confirmation_tokens(
        agreement_id=agreement_id,
        version_id=version_id,
        party_names=["Counterparty Client"],
    )
    assert len(tokens) == 1
    raw_token = tokens[0]["raw_token"]

    # 1. Execute confirmation with valid token
    tok_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"notes": "Confirmed via secure email link"},
    )
    assert tok_res.status_code == 200
    assert tok_res.json()["status"] == "confirmed"

    # 2. Replay attack attempt: same token MUST be rejected
    replay_res = client.post(
        f"/api/v1/confirmations/token/{raw_token}",
        json={"notes": "Trying again"},
    )
    assert replay_res.status_code == 400
    assert "already been executed" in replay_res.json()["detail"]

    # 3. Invalid token rejection
    bad_res = client.post("/api/v1/confirmations/token/invalid-token-xyz")
    assert bad_res.status_code == 400
    assert "Invalid or expired" in bad_res.json()["detail"]


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
