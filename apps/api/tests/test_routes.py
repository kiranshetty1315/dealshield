from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_upload_text():
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
    assert data["message_count"] == 2
    assert "Raj Mehta" in data["party_names"]
    assert "Priya Sharma" in data["party_names"]
    assert len(data["messages"]) == 2
    assert data["messages"][0]["message_id"].startswith("msg_")


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


def test_unimplemented_routes_return_501():
    # Analysis
    res_analysis = client.post("/api/v1/analysis", json={"chat_id": "test_chat_1"})
    assert res_analysis.status_code == 501
    assert "Team C" in str(res_analysis.json())

    # Agreements
    res_agreements = client.post("/api/v1/agreements", json={"analysis_id": "test_analysis_1"})
    assert res_agreements.status_code == 501
    assert "Team D" in str(res_agreements.json())

    # Confirmations
    res_conf = client.post(
        "/api/v1/confirmations",
        json={
            "agreement_id": "agr_1",
            "version_number": 1,
            "party_name": "Raj Mehta",
            "confirmed": True
        }
    )
    assert res_conf.status_code == 501
    assert "Team D" in str(res_conf.json())
