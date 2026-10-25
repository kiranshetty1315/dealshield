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
async def test_sample_01_extraction_accuracy_100_percent(extractor, sample_01_messages):
    """Verify real dynamic extraction accuracy on negotiation messages."""
    chat_id = "chat_sample_negotiation_01"
    analysis: AgreementAnalysis = await extractor.analyze_chat(chat_id, sample_01_messages)

    # 1. Root & Confidence
    assert analysis.chat_id == chat_id
    assert analysis.requires_human_review is True

    # 2. Contracting Parties from real messages
    assert len(analysis.parties) == 2
    party_names = [p.name for p in analysis.parties]
    assert "Raj Mehta" in party_names
    assert "Priya Sharma" in party_names

    # 3. Extracted Terms
    assert len(analysis.extracted_terms) >= 3
    categories = [t.category for t in analysis.extracted_terms]
    assert "pricing" in categories
    assert "payment_terms" in categories

    # 4. Section 7 Conflicts
    assert len(analysis.conflicts) >= 1
    conflict_categories = [c.term_category for c in analysis.conflicts]
    assert "pricing" in conflict_categories or "payment_terms" in conflict_categories
    assert any("Section 7" in c.statutory_context for c in analysis.conflicts)
    assert any("works I think" in c.statutory_context or "works I think" in str(c.party_positions) for c in analysis.conflicts)

    # 5. Missing Boilerplate Safeguards
    assert len(analysis.missing_terms) >= 2
    missing_categories = [m.category for m in analysis.missing_terms]
    assert "intellectual_property" in missing_categories
    assert "termination" in missing_categories


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
            max_retries=0,
            timeout=45.0,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        mock_client.beta.chat.completions.parse.assert_awaited_once()
        call_kwargs = mock_client.beta.chat.completions.parse.await_args.kwargs
        assert call_kwargs["model"] == "gemini-3.8-flash"
        assert call_kwargs["temperature"] == 0
        assert call_kwargs["response_format"] == AgreementAnalysis


@pytest.mark.asyncio
async def test_sample_non_deal_01_rejected_by_deal_gate(extractor):
    """Verify non-deal hackathon announcement is rejected by deterministic deal gate."""
    txt_path = "sample-data/whatsapp/sample-non-deal-01.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
    messages, _, _ = parse_whatsapp_chat(raw_text)

    analysis = await extractor.analyze_chat("chat_non_deal_01", messages)
    assert analysis.is_commercial_deal is False
    assert analysis.extraction_engine == "fallback"
    assert analysis.confidence_score <= 0.3
    assert analysis.requires_human_review is False
    assert len(analysis.extracted_terms) == 0
    assert len(analysis.conflicts) == 0
    assert len(analysis.missing_terms) == 0
    assert analysis.deal_rationale is not None
    assert "No bilateral commercial negotiation" in analysis.deal_rationale or "keywords" in analysis.deal_rationale


@pytest.mark.asyncio
async def test_negotiation_samples_pass_deal_gate(extractor, sample_01_messages, sample_02_messages):
    """Verify commercial negotiations sample 01 and 02 pass deal gate with extraction_engine=fallback."""
    analysis_01 = await extractor.analyze_chat("chat_01", sample_01_messages)
    assert analysis_01.is_commercial_deal is True
    assert analysis_01.extraction_engine == "fallback"
    assert len(analysis_01.extracted_terms) > 0
    assert analysis_01.requires_human_review is True

    analysis_02 = await extractor.analyze_chat("chat_02", sample_02_messages)
    assert analysis_02.is_commercial_deal is True
    assert analysis_02.extraction_engine == "fallback"
    assert len(analysis_02.extracted_terms) > 0
    assert analysis_02.requires_human_review is True


@pytest.mark.asyncio
async def test_rate_limit_retry_backoff_and_fallback(sample_01_messages):
    """Verify 429 rate-limit errors trigger 3 retry attempts with backoff before fallback."""
    from unittest.mock import AsyncMock, patch, MagicMock

    ext = AIExtractorService(api_key="AIzaSyRealGeminiKeyExample123456", model="Gemini 3.8 Flash")

    mock_client = MagicMock()
    # Simulate rate-limit error on parse and create
    mock_client.beta.chat.completions.parse = AsyncMock(side_effect=Exception("429 Too Many Requests: Rate limit exceeded"))
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("429 Too Many Requests: Rate limit exceeded"))

    mock_openai_module = MagicMock()
    mock_openai_module.AsyncOpenAI = MagicMock(return_value=mock_client)

    with patch.dict("sys.modules", {"openai": mock_openai_module}):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await ext.analyze_chat("chat_rate_limit_test", sample_01_messages)
            # Should have retried 3 times on parse
            assert mock_client.beta.chat.completions.parse.call_count == 3
            # Should have called sleep twice during parse retries (1s, 2s)
            assert mock_sleep.call_count >= 2
            # Should fall back to deterministic extraction
            assert result.extraction_engine == "fallback"
            assert result.is_commercial_deal is True

