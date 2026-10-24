import pytest
from pathlib import Path
from app.services.chat_parser import parse_whatsapp_chat, _generate_stable_message_id


def test_parse_sample_negotiation_01():
    # Load sample file
    sample_path = Path(__file__).resolve().parents[3] / "sample-data" / "whatsapp" / "sample-negotiation-01.txt"
    assert sample_path.exists(), f"Sample file not found at {sample_path}"

    raw_text = sample_path.read_text(encoding="utf-8")
    messages, parties, metadata = parse_whatsapp_chat(raw_text)

    # Verifications
    assert len(messages) == 10
    assert len(parties) == 2
    assert "Raj Mehta" in parties
    assert "Priya Sharma" in parties
    assert metadata["is_date_ambiguous"] is True  # 12/03 has day <= 12 and month <= 12

    # Verify canonical message IDs (msg_<sender>_<seq:03d>)
    assert messages[0].message_id == "msg_raj_001"
    assert messages[0].sequence_number == 1
    assert messages[0].sender == "Raj Mehta"

    assert messages[1].message_id == "msg_priya_002"
    assert messages[2].message_id == "msg_raj_003"
    assert messages[3].message_id == "msg_priya_004"
    assert messages[7].message_id == "msg_priya_008"
    assert messages[8].message_id == "msg_raj_009"
    assert messages[9].message_id == "msg_priya_010"
    assert messages[9].sequence_number == 10


def test_stable_message_id_determinism():
    id_1 = _generate_stable_message_id(3, "Raj Mehta")
    id_2 = _generate_stable_message_id(3, "Raj Mehta")
    assert id_1 == id_2
    assert id_1 == "msg_raj_003"


def test_multiline_chat_parsing():
    raw_chat = (
        "12/03/24, 10:15 - Raj Mehta: Here is the requirement:\n"
        "1. Home page\n"
        "2. Checkout\n"
        "12/03/24, 10:16 - Priya Sharma: Understood."
    )
    messages, parties, _ = parse_whatsapp_chat(raw_chat)
    assert len(messages) == 2
    assert "Checkout" in messages[0].content
    assert messages[0].message_id == "msg_raj_001"
    assert messages[0].sequence_number == 1
    assert messages[1].message_id == "msg_priya_002"
    assert messages[1].sequence_number == 2


def test_date_disambiguation_unambiguous():
    # Contains 15/03/24 which is unambiguously DD/MM (> 12)
    raw_chat = (
        "15/03/24, 14:00 - Amit Patel: Hey Neha, thanks for the call\n"
        "15/03/24, 14:02 - Neha Gupta: Of course!"
    )
    messages, parties, metadata = parse_whatsapp_chat(raw_chat)
    assert len(messages) == 2
    assert metadata["is_date_ambiguous"] is False
    assert "unambiguously verified" in metadata["date_format"]


def test_unparseable_timestamp_fails_loudly():
    # Evidentiary integrity rule: must fail loudly rather than fabricating now()
    raw_malformed = (
        "99/99/99, 99:99 - Hacker: Tampered message\n"
    )
    with pytest.raises(ValueError, match="Evidentiary Integrity Error"):
        parse_whatsapp_chat(raw_malformed)
