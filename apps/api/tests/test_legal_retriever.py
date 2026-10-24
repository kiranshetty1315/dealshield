"""Unit tests for Legal Knowledge Retriever (Team C)."""

import pytest
from app.schemas.analysis import ExtractedTerm, TermStatus, ConfidenceLevel, ImportanceLevel
from app.services.legal_retriever import LegalRetrieverService


@pytest.fixture
def retriever():
    return LegalRetrieverService()


def test_statutory_standards_curated(retriever):
    standards = retriever.get_statutory_standards()

    # Section 2(h) & 10 ICA 1872: Lawful consideration and mutual consent
    assert "ica_s2h_s10" in standards
    s2h = standards["ica_s2h_s10"]
    assert "Section 2(h)" in s2h["sections"]
    assert "Section 10" in s2h["sections"]
    assert "Indian Contract Act, 1872" in s2h["statute"]
    assert "Lawful Consideration" in s2h["title"]

    # Section 7 ICA 1872: Absolute acceptance vs counter-offers
    assert "ica_s7" in standards
    s7 = standards["ica_s7"]
    assert "Section 7" in s7["sections"]
    assert "absolute and unqualified" in s7["statutory_text"].lower()

    # Section 73 ICA 1872: Compensation for breach
    assert "ica_s73" in standards
    s73 = standards["ica_s73"]
    assert "Section 73" in s73["sections"]
    assert "breach" in s73["title"].lower()

    # Copyright Act 1957: IP assignment upon full consideration
    assert "copyright_act_1957" in standards
    cip = standards["copyright_act_1957"]
    assert "Section 17" in cip["sections"]
    assert "Section 19" in cip["sections"]
    assert "Copyright Act, 1957" in cip["statute"]


def test_mandatory_clauses_for_service_agreement(retriever):
    clauses = retriever.get_mandatory_clauses("service_agreement")
    categories = [c["category"] for c in clauses]

    assert "scope" in categories
    assert "pricing" in categories
    assert "acceptance" in categories
    assert "intellectual_property" in categories
    assert "termination" in categories
    assert "dispute_resolution" in categories


def test_detect_missing_terms_when_unaddressed(retriever):
    # Extracted terms only contain pricing and timeline
    partial_terms = [
        ExtractedTerm(
            term_id="term_price_01",
            category="pricing",
            description="Project fee",
            proposed_value="₹1,00,000",
            accepted_value="₹1,00,000",
            status=TermStatus.AGREED,
            source_message_ids=["msg_raj_005"],
            confidence=ConfidenceLevel.HIGH,
        ),
        ExtractedTerm(
            term_id="term_timeline_01",
            category="timeline",
            description="Delivery deadline",
            proposed_value="End of April",
            accepted_value="End of April",
            status=TermStatus.AGREED,
            source_message_ids=["msg_raj_007"],
            confidence=ConfidenceLevel.HIGH,
        ),
    ]

    missing = retriever.detect_missing_terms(partial_terms)
    term_ids = [m.term_id for m in missing]

    # Must flag IP ownership safeguard (Copyright Act 1957)
    assert "missing_ip_01" in term_ids
    ip_item = next(m for m in missing if m.term_id == "missing_ip_01")
    assert ip_item.category == "intellectual_property"
    assert ip_item.importance == ImportanceLevel.CRITICAL
    assert "full receipt of consideration" in ip_item.recommendation.lower() or "assign" in ip_item.recommendation.lower()

    # Must flag termination notice safeguard (ICA Section 73)
    assert "missing_termination_01" in term_ids
    term_item = next(m for m in missing if m.term_id == "missing_termination_01")
    assert term_item.category == "termination"
    assert term_item.importance == ImportanceLevel.IMPORTANT
    assert "7-day" in term_item.recommendation or "termination notice" in term_item.recommendation.lower()


def test_detect_missing_terms_when_already_covered(retriever):
    full_terms = [
        ExtractedTerm(
            term_id="term_ip_01",
            category="intellectual_property",
            description="All code and designs assigned to Client",
            status=TermStatus.AGREED,
            confidence=ConfidenceLevel.HIGH,
        ),
        ExtractedTerm(
            term_id="term_term_01",
            category="termination",
            description="14 days written notice for termination",
            status=TermStatus.AGREED,
            confidence=ConfidenceLevel.HIGH,
        ),
    ]

    missing = retriever.detect_missing_terms(full_terms)
    assert len(missing) == 0
