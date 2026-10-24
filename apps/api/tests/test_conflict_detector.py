"""Unit tests for Section 7 Conflict Detector (Team C)."""

import pytest
from datetime import datetime, timezone
from app.schemas.chat import Message
from app.schemas.analysis import ConflictSeverity
from app.services.conflict_detector import ConflictDetectorService
from app.services.chat_parser import parse_whatsapp_chat


@pytest.fixture
def detector():
    return ConflictDetectorService()


def test_section_7_qualifier_patterns_detection(detector):
    hedges = [
        "Sure, that works I think. Let's go ahead",
        "I could consider that, but it depends on the timeline",
        "Wait, I thought that was included in the price",
        "For ₹1,00,000 I might be able to do it",
        "Let me think about it over the weekend",
        "Subject to final approval from my team",
    ]
    for hedge in hedges:
        qualifiers = detector.find_qualifiers(hedge)
        assert len(qualifiers) > 0, f"Expected qualifier in '{hedge}'"


def test_clean_acceptance_has_no_hedges(detector):
    clean = "Yes, I agree to the price of ₹1,00,000 and the deadline of April 30. Let's proceed."
    qualifiers = detector.find_qualifiers(clean)
    assert len(qualifiers) == 0


def test_price_counter_proposals_sample_01(detector):
    raw_chat = (
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
    messages, _, _ = parse_whatsapp_chat(raw_chat)
    conflicts = detector.detect_conflicts(messages)

    assert len(conflicts) == 1
    conflict = conflicts[0]
    assert conflict.conflict_id == "conflict_price_01"
    assert conflict.term_category == "pricing"
    assert conflict.severity == ConflictSeverity.HIGH
    assert "₹75,000" in conflict.description
    assert "₹1,50,000" in conflict.description
    assert "₹1,00,000" in conflict.description

    # Citations must cover the counter-proposals and hedged acceptance
    expected_ids = ["msg_raj_003", "msg_priya_004", "msg_raj_005", "msg_priya_008", "msg_raj_009"]
    for eid in expected_ids:
        assert eid in conflict.source_message_ids, f"Expected citation {eid} in conflict source messages"

    # Party positions
    assert "Raj Mehta" in conflict.party_positions
    assert "Priya Sharma" in conflict.party_positions
    assert "works I think" in conflict.party_positions["Raj Mehta"]
    assert "50% upfront" in conflict.party_positions["Priya Sharma"]

    # Statutory framing under Section 7 Indian Contract Act 1872
    assert "Section 7" in conflict.statutory_context
    assert "absolute and unqualified" in conflict.statutory_context.lower()


def test_scope_inclusion_conflict_sample_02(detector):
    raw_chat = (
        "15/03/24, 14:00 - Amit Patel: Hey Neha, thanks for the call yesterday about the marketing campaign\n"
        "15/03/24, 14:02 - Neha Gupta: Of course! I'm excited to work on this\n"
        "15/03/24, 14:03 - Amit Patel: So we agreed on a 3-month social media campaign right?\n"
        "15/03/24, 14:05 - Neha Gupta: Yes, Instagram, LinkedIn, and Twitter. Monthly content calendar with 20 posts per platform\n"
        "15/03/24, 14:07 - Amit Patel: Perfect. And the total cost is ₹2,40,000 for 3 months?\n"
        "15/03/24, 14:10 - Neha Gupta: That's the base package. Ad spend is separate, you mentioned ₹50,000/month for ads\n"
        "15/03/24, 14:12 - Amit Patel: Wait, I thought that was included in the ₹2,40,000\n"
        "15/03/24, 14:15 - Neha Gupta: No no, ₹2,40,000 is my service fee. Ad spend is always separate\n"
        "15/03/24, 14:17 - Amit Patel: Hmm that changes the budget significantly. Let me think about it\n"
        "15/03/24, 14:20 - Neha Gupta: Sure, take your time. But I'll need confirmation by this Friday to start next month\n"
        "15/03/24, 14:22 - Amit Patel: Ok I'll get back to you\n"
    )
    messages, _, _ = parse_whatsapp_chat(raw_chat)
    conflicts = detector.detect_conflicts(messages)

    assert len(conflicts) >= 1
    # Check that pricing/scope inclusion misunderstanding was flagged
    categories = [c.term_category for c in conflicts]
    assert "pricing" in categories or "scope" in categories
    
    # Check that the ad spend inclusion messages were cited
    all_cited = []
    for c in conflicts:
        all_cited.extend(c.source_message_ids)
    assert "msg_amit_007" in all_cited  # "Wait, I thought that was included..."


def test_empty_messages_returns_no_conflicts(detector):
    assert detector.detect_conflicts([]) == []
