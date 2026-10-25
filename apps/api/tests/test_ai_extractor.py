"""Unit tests for AI Extractor Service (Team C).

Verifies 100% extraction accuracy against sample-negotiation-01-expected.json
and dynamic extraction on other negotiations.
"""

import json
import os
import pytest
from app.schemas.analysis import (
    AgreementAnalysis,
    ConfidenceLevel,
    TermStatus,
    ConflictSeverity,
    ImportanceLevel,
)
from app.services.ai_extractor import AIExtractorService
from app.services.chat_parser import parse_whatsapp_chat


@pytest.fixture
def extractor():
    return AIExtractorService(api_key="")


@pytest.fixture
def sample_01_fixture():
    fixture_path = "sample-data/expected-results/sample-negotiation-01-expected.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def sample_01_messages():
    txt_path = "sample-data/whatsapp/sample-negotiation-01.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
    messages, _, _ = parse_whatsapp_chat(raw_text)
    return messages


@pytest.fixture
def sample_02_messages():
    txt_path = "sample-data/whatsapp/sample-negotiation-02.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
    messages, _, _ = parse_whatsapp_chat(raw_text)
    return messages


@pytest.mark.asyncio
async def test_sample_01_extraction_accuracy_100_percent(extractor, sample_01_messages, sample_01_fixture):
    """Verify 100% extraction accuracy against sample-negotiation-01-expected.json."""
    chat_id = "chat_sample_negotiation_01"
    analysis: AgreementAnalysis = await extractor.analyze_chat(chat_id, sample_01_messages)

    # 1. Root & Confidence
    assert analysis.chat_id == chat_id
    assert analysis.confidence_score == sample_01_fixture["confidence_score"]
    assert analysis.requires_human_review == sample_01_fixture["requires_human_review"]

    # 2. Contracting Parties
    assert len(analysis.parties) == len(sample_01_fixture["parties"])
    for expected_party in sample_01_fixture["parties"]:
        matched = next((p for p in analysis.parties if p.party_id == expected_party["party_id"]), None)
        assert matched is not None, f"Missing party {expected_party['party_id']}"
        assert matched.name == expected_party["name"]
        assert matched.detected_role == expected_party["detected_role"]

    # 3. Extracted Terms
    assert len(analysis.extracted_terms) == len(sample_01_fixture["extracted_terms"])
    for expected_term in sample_01_fixture["extracted_terms"]:
        actual_term = next((t for t in analysis.extracted_terms if t.term_id == expected_term["term_id"]), None)
        assert actual_term is not None, f"Missing term {expected_term['term_id']}"
        assert actual_term.category == expected_term["category"]
        assert actual_term.description == expected_term["description"]
        assert actual_term.proposed_value == expected_term["proposed_value"]
        assert actual_term.accepted_value == expected_term["accepted_value"]
        assert actual_term.status.value == expected_term["status"]
        assert actual_term.confidence.value == expected_term["confidence"]
        assert actual_term.source_message_ids == expected_term["source_message_ids"]

    # 4. Section 7 Conflicts
    assert len(analysis.conflicts) == len(sample_01_fixture["conflicts"])
    expected_conflict = sample_01_fixture["conflicts"][0]
    actual_conflict = analysis.conflicts[0]

    assert actual_conflict.conflict_id == expected_conflict["conflict_id"]
    assert actual_conflict.term_category == expected_conflict["term_category"]
    assert actual_conflict.severity.value == expected_conflict["severity"]
    assert actual_conflict.source_message_ids == expected_conflict["source_message_ids"]
    assert actual_conflict.party_positions == expected_conflict["party_positions"]
    assert "Section 7" in actual_conflict.statutory_context
    assert "works I think" in actual_conflict.statutory_context

    # 5. Missing Boilerplate Safeguards
    assert len(analysis.missing_terms) == len(sample_01_fixture["missing_terms"])
    for expected_missing in sample_01_fixture["missing_terms"]:
        actual_missing = next((m for m in analysis.missing_terms if m.term_id == expected_missing["term_id"]), None)
        assert actual_missing is not None, f"Missing term safeguard {expected_missing['term_id']}"
        assert actual_missing.category == expected_missing["category"]
        assert actual_missing.importance.value == expected_missing["importance"]
        assert actual_missing.recommendation == expected_missing["recommendation"]


@pytest.mark.asyncio
async def test_dynamic_extraction_sample_02(extractor, sample_02_messages):
    """Verify dynamic extraction on sample 2 (Amit Patel & Neha Gupta)."""
    chat_id = "chat_sample_negotiation_02"
    analysis: AgreementAnalysis = await extractor.analyze_chat(chat_id, sample_02_messages)

    assert analysis.chat_id == chat_id
    assert len(analysis.parties) == 2
    party_names = [p.name for p in analysis.parties]
    assert "Amit Patel" in party_names
    assert "Neha Gupta" in party_names

    # Check extracted terms
    term_categories = [t.category for t in analysis.extracted_terms]
    assert "pricing" in term_categories

    # Check conflict detected (ad spend separate vs included)
    assert len(analysis.conflicts) >= 1
    assert analysis.requires_human_review is True

    # Check missing boilerplate
    missing_categories = [m.category for m in analysis.missing_terms]
    assert "intellectual_property" in missing_categories
    assert "termination" in missing_categories


@pytest.mark.asyncio
async def test_pydantic_schema_serialization(extractor, sample_01_messages):
    """Verify serialization to dictionary matches schema types."""
    analysis = await extractor.analyze_chat("chat_test_serialize", sample_01_messages)
    data = analysis.model_dump()
    assert isinstance(data["parties"], list)
    assert isinstance(data["extracted_terms"], list)
    assert isinstance(data["conflicts"], list)
    assert isinstance(data["missing_terms"], list)
    assert isinstance(data["confidence_score"], float)
    assert isinstance(data["requires_human_review"], bool)


@pytest.mark.asyncio
async def test_gemini_3_8_flash_model_normalization_and_defaults():
    """Verify Gemini 3.8 Flash is configured as primary LLM with name normalization."""
    default_extractor = AIExtractorService()
    assert default_extractor.model == "gemini-3.8-flash"
    assert default_extractor.provider == "gemini"
    assert "googleapis.com" in default_extractor.base_url

    # Check user-friendly model name normalization
    ext1 = AIExtractorService(model="Gemini 3.8 Flash")
    assert ext1.model == "gemini-3.8-flash"

    ext2 = AIExtractorService(model="Gemini 3.8")
    assert ext2.model == "gemini-3.8-flash"

    ext3 = AIExtractorService(model="gemini-3.8-flash")
    assert ext3.model == "gemini-3.8-flash"


@pytest.mark.asyncio
async def test_gemini_provider_precedence():
    """Verify Gemini is preferred when valid key is provided."""
    # Live Gemini key provided
    gemini_ext = AIExtractorService(api_key="AIzaSyRealGeminiKeyExample123456")
    assert gemini_ext.provider == "gemini"
    assert gemini_ext.model == "gemini-3.8-flash"
    assert gemini_ext._is_live_configured() is True
    assert gemini_ext._is_live_gemini_configured() is True

    # Placeholder keys fallback to deterministic engine
    placeholder_ext = AIExtractorService(api_key="AIzaSy-placeholder-key")
    assert placeholder_ext._is_live_configured() is False


@pytest.mark.asyncio
async def test_gemini_mocked_live_call(sample_01_messages, sample_01_fixture):
    """Verify live Gemini call path via AsyncOpenAI client interface."""
    from unittest.mock import AsyncMock, patch, MagicMock

    ext = AIExtractorService(api_key="AIzaSyRealGeminiKeyExample123456", model="Gemini 3.8 Flash")
    assert ext.model == "gemini-3.8-flash"

    expected_analysis = AgreementAnalysis.model_validate(sample_01_fixture)

    mock_parsed_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.parsed = expected_analysis
    mock_parsed_completion.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.beta.chat.completions.parse = AsyncMock(return_value=mock_parsed_completion)

    mock_openai_module = MagicMock()
    mock_openai_module.AsyncOpenAI = MagicMock(return_value=mock_client)

    with patch.dict("sys.modules", {"openai": mock_openai_module}):
        result = await ext.analyze_chat("chat_gemini_test", sample_01_messages)
        assert result.confidence_score == 0.85
        assert len(result.parties) == 2
        mock_openai_module.AsyncOpenAI.assert_called_once_with(
            api_key="AIzaSyRealGeminiKeyExample123456",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        mock_client.beta.chat.completions.parse.assert_awaited_once()
        call_kwargs = mock_client.beta.chat.completions.parse.await_args.kwargs
        assert call_kwargs["model"] == "gemini-3.8-flash"
        assert call_kwargs["response_format"] == AgreementAnalysis
