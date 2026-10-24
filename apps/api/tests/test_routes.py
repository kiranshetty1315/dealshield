from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_upload_and_persistence():
    sample_chat = (
        "12/03/24, 10:15 - Raj Mehta: Hi Priya, let's discuss the project\n"
        "12/03/24, 10:16 - Priya Sharma: Sounds good Raj\n"
    )
    response = client.post(
        "/api/v1/chats/upload",
        content=sample_chat,
        headers={"Content-Type": "text/plain"},
    )
    assert response.status_code == 201
    data = response.json()
    chat_id = data["chat_id"]
    assert data["message_count"] == 2
    assert "Raj Mehta" in data["party_names"]
    assert "Priya Sharma" in data["party_names"]
    assert len(data["messages"]) == 2
    assert data["messages"][0]["message_id"] == "msg_raj_001"
    assert data["messages"][1]["message_id"] == "msg_priya_002"
    assert "date_format_inferred" in data

    # Verify retrieval from database (Team D)
    get_res = client.get(f"/api/v1/chats/{chat_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["chat_id"] == chat_id
    assert get_data["message_count"] == 2
    assert len(get_data["messages"]) == 2
    assert get_data["messages"][0]["content"] == "Hi Priya, let's discuss the project"


def test_chat_upload_12_hour_with_seconds():
    # Matches user format: Line 1 encryption header, Line 2 12-hour timestamp with seconds
    sample_chat = (
        "Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.\n"
        "7/27/26, 12:17:00 PM - Raj Mehta: Hi Priya, regarding the website project\n"
        "7/27/26, 12:18:00 PM - Priya Sharma: Yes, let's finalize the terms\n"
    )
    response = client.post(
        "/api/v1/chats/upload",
        content=sample_chat,
        headers={"Content-Type": "text/plain"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["message_count"] == 2
    assert "Raj Mehta" in data["party_names"]
    assert "Priya Sharma" in data["party_names"]


def test_chat_upload_file_size_limit():
    # 10 MB limit check: header indicating oversized payload
    oversized_headers = {
        "Content-Type": "text/plain",
        "Content-Length": str(11 * 1024 * 1024),  # 11 MB
    }
    response = client.post(
        "/api/v1/chats/upload",
        content="some small content but header declares 11MB",
        headers=oversized_headers,
    )
    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


def test_chat_upload_unparseable_timestamp_fails():
    malformed_chat = "99/99/99, 99:99 - Fake User: Malformed timestamp line\n"
    response = client.post(
        "/api/v1/chats/upload",
        content=malformed_chat,
        headers={"Content-Type": "text/plain"},
    )
    assert response.status_code == 422
    assert "Evidentiary Integrity Error" in response.json()["detail"]


def test_evidence_verify_route():
    content = "Final agreed service terms for web project"
    import hashlib
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()

    response = client.post(
        "/api/v1/evidence/verify",
        json={"content": content, "expected_hash": digest},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["computed_hash"] == digest
    assert "limitations_notice" in data


def test_analysis_endpoint_success_and_persistence():
    # 1. Upload sample chat
    sample_chat = (
        "12/03/24, 10:15 - Raj Mehta: Hi Priya, regarding the website project we discussed\n"
        "12/03/24, 10:16 - Priya Sharma: Yes, I've been thinking about it. I can handle the full redesign\n"
        "12/03/24, 10:18 - Raj Mehta: Great. My budget is around ₹75,000 for everything\n"
        "12/03/24, 10:20 - Priya Sharma: That's quite low for a full redesign. I'd normally charge ₹1,50,000\n"
        "12/03/24, 10:22 - Raj Mehta: Can we meet somewhere in the middle? Maybe ₹1,00,000?\n"
        "12/03/24, 10:25 - Priya Sharma: I could consider that, but it depends on the timeline\n"
        "12/03/24, 10:27 - Raj Mehta: I need it done by end of April\n"
        "12/03/24, 10:30 - Priya Sharma: That's tight. For ₹1,00,000 I might be able to do it, but I'd need 50% upfront\n"
        "12/03/24, 10:32 - Raj Mehta: Sure, that works I think. Let's go ahead\n"
        "12/03/24, 10:35 - Priya Sharma: Ok sounds good. I'll send over some initial mockups next week\n"
    )
    upload_res = client.post(
        "/api/v1/chats/upload",
        content=sample_chat,
        headers={"Content-Type": "text/plain"},
    )
    assert upload_res.status_code == 201
    chat_id = upload_res.json()["chat_id"]

    # 2. Trigger analysis (Team C)
    res_analysis = client.post("/api/v1/analysis", json={"chat_id": chat_id})
    assert res_analysis.status_code == 200
    analysis = res_analysis.json()
    assert analysis["chat_id"] == chat_id
    assert len(analysis["parties"]) == 2
    assert len(analysis["extracted_terms"]) == 4
    assert len(analysis["conflicts"]) >= 1
    assert analysis["conflicts"][0]["conflict_id"] == "conflict_price_01"
    assert "Section 7" in analysis["conflicts"][0]["statutory_context"]
    assert len(analysis["missing_terms"]) >= 2
    analysis_id = analysis["analysis_id"]

    # 3. Retrieve analysis by ID
    get_res = client.get(f"/api/v1/analysis/{analysis_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["analysis_id"] == analysis_id
    assert retrieved["chat_id"] == chat_id

    # 3b. Retrieve or auto-generate analysis directly by chat ID
    by_chat_res = client.get(f"/api/v1/analysis/chat/{chat_id}")
    assert by_chat_res.status_code == 200
    assert by_chat_res.json()["chat_id"] == chat_id

    # 4. Generate draft agreement using this analysis (End-to-End pipeline)
    ag_res = client.post("/api/v1/agreements", json={"analysis_id": analysis_id})
    assert ag_res.status_code == 201
    agreement = ag_res.json()
    assert agreement["analysis_id"] == analysis_id
    assert len(agreement["versions"]) >= 1
    agreement_id = agreement["id"]

    # 4b. Get agreement by chat ID directly
    ag_by_chat = client.get(f"/api/v1/agreements/chat/{chat_id}")
    assert ag_by_chat.status_code == 200
    assert ag_by_chat.json()["id"] == agreement_id

    # 4c. Create updated agreement version
    v2_res = client.post(f"/api/v1/agreements/{agreement_id}/versions", json={"analysis_id": analysis_id})
    assert v2_res.status_code == 200
    v2_data = v2_res.json()
    assert v2_data["current_version"] == 2
    assert len(v2_data["versions"]) == 2


def test_analysis_nonexistent_chat_fails():
    res = client.post("/api/v1/analysis", json={"chat_id": "nonexistent-chat-uuid"})
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_sample_agreement_uuid_auto_seeds_cleanly():
    """Verify sample-agreement-uuid returns 200 OK and autoseeds default agreement."""
    res = client.get("/api/v1/agreements/sample-agreement-uuid")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "sample-agreement-uuid"
    assert "Raj Mehta" in data["parties"]
    assert "Priya Sharma" in data["parties"]
    assert len(data["versions"]) >= 1


def test_dashboard_stats_endpoint():
    """Verify GET /api/v1/dashboard/stats returns real aggregate metrics and recent list."""
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_conversations" in data
    assert "total_agreements" in data
    assert "confirmed_agreements" in data
    assert "pending_review_count" in data
    assert "total_hashes" in data
    assert "recent_conversations" in data
    assert isinstance(data["recent_conversations"], list)
    if data["recent_conversations"]:
        first = data["recent_conversations"][0]
        assert "id" in first
        assert "filename" in first
        assert "party_names" in first
        assert "message_count" in first
        assert "status" in first
        assert "status_variant" in first

