from pathlib import Path
from app.services.chat_parser import parse_whatsapp_chat, _generate_stable_message_id


def test_parse_sample_negotiation_01():
    # Load sample file
    sample_path = Path(__file__).resolve().parents[3] / "sample-data" / "whatsapp" / "sample-negotiation-01.txt"
    assert sample_path.exists(), f"Sample file not found at {sample_path}"

    raw_text = sample_path.read_text(encoding="utf-8")
    messages, parties = parse_whatsapp_chat(raw_text)

    # Verifications
    assert len(messages) == 10
    assert len(parties) == 2
    assert "Raj Mehta" in parties
    assert "Priya Sharma" in parties

    # Verify stable IDs
    for msg in messages:
        assert msg.message_id.startswith("msg_")
        assert len(msg.message_id) > 10
        assert msg.sender in parties
        assert len(msg.content) > 0

    # First message verification
    first = messages[0]
    assert first.sender == "Raj Mehta"
    assert "website project" in first.content
    assert first.sequence_number == 0

    # Final message verification
    last = messages[-1]
    assert last.sender == "Priya Sharma"
    assert "initial mockups" in last.content
    assert last.sequence_number == 9


def test_stable_message_id_determinism():
    id_1 = _generate_stable_message_id(0, "Raj Mehta", "2024-03-12T10:15:00", "Hi Priya")
    id_2 = _generate_stable_message_id(0, "Raj Mehta", "2024-03-12T10:15:00", "Hi Priya")
    assert id_1 == id_2


def test_multiline_chat_parsing():
    raw_chat = (
        "12/03/24, 10:15 - Raj Mehta: Here is the requirement:\n"
        "1. Home page\n"
        "2. Checkout\n"
        "12/03/24, 10:16 - Priya Sharma: Understood."
    )
    messages, parties = parse_whatsapp_chat(raw_chat)
    assert len(messages) == 2
    assert "Checkout" in messages[0].content
    assert messages[0].sequence_number == 0
    assert messages[1].sequence_number == 1
