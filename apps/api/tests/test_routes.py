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


def test_team_c_analysis_endpoint_remains_pending():
    # Analysis trigger is owned by Team C
    res_analysis = client.post("/api/v1/analysis", json={"chat_id": "test_chat_1"})
    assert res_analysis.status_code == 501
    assert "Team C" in str(res_analysis.json())
