"""AI Extractor Service (Owned by Team C: AI and Legal Intelligence).

Extracts structured agreement terms using Google Gemini 3.8 Flash (gemini-3.8-flash)
structured outputs with Pydantic schema validation (AgreementAnalysis). Supports
live Gemini API calls (via Google AI Studio OpenAI-compatible endpoint) with an
intelligent deterministic fallback for offline evaluation matching
sample-negotiation-01-expected.json.
"""

import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.db.repository import ensure_uuid
from app.schemas.analysis import (
    AgreementAnalysis,
    Party,
    ExtractedTerm,
    MissingTerm,
    ConflictItem,
    ConfidenceLevel,
    TermStatus,
    ConflictSeverity,
    ImportanceLevel,
)
from app.schemas.chat import Message
from app.services.conflict_detector import ConflictDetectorService, PRICE_REGEX
from app.services.legal_retriever import LegalRetrieverService

logger = logging.getLogger(__name__)

SCOPE_KEYWORDS = [
    "design",
    "develop",
    "campaign",
    "website",
    "work",
    "deliver",
    "project",
    "article",
    "content",
    "video",
    "edit",
    "consult",
    "service",
    "marketing",
    "build",
    "audit",
    "redesign",
]

PRICE_REPLY_REGEX = re.compile(
    r"\b(price|prices|budget|budgets|rate|rates|fee|fees|charge|charges|cost|costs|ok|okay|deal|agree|agreed|works|can do|too high|too low|instead|sounds good|sure|perfect|fine|accepted|accept|done|yes|confirmed|confirm|go ahead|great)\b",
    re.IGNORECASE,
)

EXTRACTION_SYSTEM_PROMPT = """You are DealShield AI's Senior Legal Intelligence and Contract Extraction Engine.
Your role is to parse informal business conversations (WhatsApp transcripts) and convert them into structured,
legally rigorous commercial contract agreements governed by Indian commercial law.

COMMERCIAL DEAL DEFINITION & QUALIFICATION GATE:
A commercial deal requires:
(a) two or more parties,
(b) an exchange of paid work/goods/services for money or other consideration, and
(c) at least one proposal or counter-proposal between those parties.
Announcements, prizes, giveaways, event invitations, hackathons, general chat, and amounts not offered between the parties are NOT deals.

If the conversation is NOT a commercial deal:
- Set is_commercial_deal = false.
- Set deal_rationale to a concise one-sentence explanation of why it is not a commercial deal (e.g. "This conversation represents an event prize announcement rather than a bilateral commercial negotiation between contracting parties.").
- Set extraction_engine = "llm".
- Return empty arrays for extracted_terms ([]), conflicts ([]), and missing_terms ([]).
- Set confidence_score to 0.9.
- Set requires_human_review = false.

If the conversation IS a commercial deal:
- Set is_commercial_deal = true.
- Set deal_rationale to a concise one-sentence description of the commercial arrangement.
- Set extraction_engine = "llm".
- Extract all terms, conflicts, and missing statutory boilerplate as instructed below.

STATUTORY FOUNDATION TO ENFORCE:
1. Indian Contract Act, 1872:
   - Section 2(h) & Section 10: Lawful consideration and mutual free consent.
   - Section 7: ACCEPTANCE MUST BE ABSOLUTE AND UNQUALIFIED. Any hedge, counter-offer, or reservation
     (e.g., 'Sure, that works I think', 'depends on timeline', 'Wait, I thought that was included') is NOT
     legal acceptance. You MUST flag these in 'conflicts' with exact message citations.
   - Section 73: Compensation for loss or damage caused by breach of contract.
2. Copyright Act, 1957:
   - Sections 17 & 19: Author is first owner. Intellectual property rights must be explicitly assigned in writing
     to the client upon receipt of consideration.
3. Information Technology Act, 2000 (Section 10A): Legal validity of contracts formed electronically.

EXTRACTION INSTRUCTIONS:
- Identify contracting parties with names and detected roles (e.g. 'Client', 'Service Provider').
- Extract key contractual terms: scope, pricing, payment_terms, timeline, deliverables.
- Map citations to exact message IDs (e.g. msg_raj_001, msg_priya_004).
- Flag any price discrepancies, counter-proposals, or Section 7 qualified acceptances in 'conflicts'.
- Flag absent boilerplate safeguards (IP ownership, termination notice) in 'missing_terms'.
- Always return structured JSON strictly validating against the AgreementAnalysis schema.
"""


def clean_timeline_text(text: str) -> str:
    """Extracts actual date, timeframe, or duration, stripping conversational chat pleasantries."""
    if not text:
        return ""
    phrase_match = re.search(
        r"\b(?:by\s+end\s+of\s+[A-Za-z]+|by\s+[A-Za-z0-9\s,]+|within\s+\d+\s*(?:weeks?|days?|months?)|in\s+\d+\s*(?:weeks?|days?|months?)|next\s+week)\b",
        text,
        re.IGNORECASE,
    )
    if phrase_match:
        return phrase_match.group(0).strip()

    cleaned = re.sub(
        r"^(?:ok|okay|sounds good|great|sure|perfect|noted|yes|thanks|thank you)[.,!\s]*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"^(?:i(?:'ll|\s+will|\s+can)?\s+(?:send\s+over|deliver|share|need\s+it))\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.strip() or text.strip()


class AIExtractorService:
    """Service boundary for Google Gemini 3.8 Flash structured analysis and deterministic fallback."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        if api_key == "":
            gemini_key = ""
            openai_key = ""
        else:
            gemini_key = api_key or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
            openai_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")

        raw_model = model or os.getenv("GEMINI_MODEL") or getattr(settings, "GEMINI_MODEL", "gemini-3.8-flash")
        self.model = self._normalize_model_name(raw_model)

        if self._is_valid_key(gemini_key):
            self.provider = "gemini"
            self.api_key = gemini_key
            self.base_url = base_url or getattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
        elif self._is_valid_key(openai_key):
            self.provider = "openai"
            self.api_key = openai_key
            self.base_url = base_url
            if not model:
                self.model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        else:
            self.provider = "gemini"
            self.api_key = gemini_key or "AIzaSy-placeholder-gemini-key"
            self.base_url = base_url or getattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")

        self.conflict_detector = ConflictDetectorService()
        self.legal_retriever = LegalRetrieverService()

    @staticmethod
    def _normalize_model_name(model_name: str) -> str:
        """Map user-friendly names like 'Gemini 3.8 Flash' to Google API model identifier."""
        clean = model_name.strip()
        lower = clean.lower()
        if lower in ("gemini 3.8 flash", "gemini-3.8-flash", "gemini 3.8", "gemini-3.8"):
            return "gemini-3.8-flash"
        if lower in ("gemini 2.0 flash", "gemini-2.0-flash"):
            return "gemini-2.0-flash"
        if lower in ("gemini 1.5 flash", "gemini-1.5-flash"):
            return "gemini-1.5-flash"
        return clean

    @staticmethod
    def _is_valid_key(key: Optional[str]) -> bool:
        """Verify whether an API key is non-empty and non-placeholder."""
        if not key:
            return False
        k = key.strip()
        if "placeholder" in k.lower() or len(k) < 15:
            return False
        return True

    def _is_live_configured(self) -> bool:
        """Verify whether a live LLM API key (Gemini 3.8 Flash or OpenAI) is present."""
        return self._is_valid_key(self.api_key)

    def _is_live_gemini_configured(self) -> bool:
        return self.provider == "gemini" and self._is_valid_key(self.api_key)

    def _is_live_openai_configured(self) -> bool:
        return self._is_live_configured()

    async def analyze_chat(
        self, chat_id: str, messages: List[Message], focus_areas: Optional[List[str]] = None
    ) -> AgreementAnalysis:
        """Extract structured agreement terms using Gemini 3.8 Flash structured outputs or dynamic extractor."""
        if self._is_live_configured():
            try:
                res = await self._call_llm_extractor(chat_id, messages, focus_areas)
                res.analysis_id = ensure_uuid(res.analysis_id)
                return res
            except Exception as e:
                logger.warning(
                    f"Live {self.provider.upper()} extraction failed ({type(e).__name__}: {str(e)}). "
                    "Flipping to dynamic extraction engine."
                )

        # Dynamic extraction parsing real conversation messages
        res = self._deterministic_extract(chat_id, messages, focus_areas)
        res.analysis_id = ensure_uuid(res.analysis_id)
        return res

    async def _call_llm_extractor(
        self, chat_id: str, messages: List[Message], focus_areas: Optional[List[str]] = None
    ) -> AgreementAnalysis:
        """Invoke live Gemini 3.8 Flash (or OpenAI fallback) with structured output schema validation."""
        try:
            from openai import AsyncOpenAI
        except ImportError as ie:
            logger.warning("openai client package not available, falling back to deterministic extractor.")
            raise ie

        client_kwargs: Dict[str, Any] = {
            "api_key": self.api_key,
            "max_retries": 0,
            "timeout": 45.0,
        }
        if self.base_url:
            client_kwargs["base_url"] = self.base_url

        client = AsyncOpenAI(**client_kwargs)

        # Format chat transcript for LLM context
        transcript_lines = []
        for m in messages:
            ts_str = m.timestamp.strftime("%d/%m/%Y, %H:%M") if hasattr(m.timestamp, "strftime") else str(m.timestamp)
            transcript_lines.append(f"[{m.message_id}] {ts_str} - {m.sender}: {m.content}")
        transcript_text = "\n".join(transcript_lines)

        user_content = (
            f"Analyze the following conversation (Chat ID: {chat_id}) and determine if it represents a commercial deal. "
            f"If it is a commercial deal, extract all agreement terms, "
            f"conflicts under Section 7 Indian Contract Act, and missing statutory boilerplate clauses. "
            f"If not, set is_commercial_deal=false with deal_rationale.\n\n"
            f"CONVERSATION TRANSCRIPT:\n{transcript_text}\n"
        )
        if focus_areas:
            user_content += f"\nPriority focus areas: {', '.join(focus_areas)}\n"

        delays = [1.0, 2.0, 4.0]

        async def _call_parse_with_backoff():
            for attempt in range(3):
                try:
                    return await client.beta.chat.completions.parse(
                        model=self.model,
                        temperature=0,
                        messages=[
                            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                            {"role": "user", "content": user_content},
                        ],
                        response_format=AgreementAnalysis,
                    )
                except Exception as exc:
                    exc_name = type(exc).__name__.lower()
                    exc_msg = str(exc).lower()
                    is_rate_or_timeout = (
                        isinstance(exc, (TimeoutError, asyncio.TimeoutError))
                        or "ratelimit" in exc_name
                        or "timeout" in exc_name
                        or "429" in exc_msg
                        or "resource_exhausted" in exc_msg
                    )
                    if is_rate_or_timeout and attempt < 2:
                        delay = delays[attempt]
                        logger.warning(
                            f"LLM API rate limit or timeout ({type(exc).__name__}: {exc}). "
                            f"Retrying in {delay}s (attempt {attempt + 1}/3)..."
                        )
                        await asyncio.sleep(delay)
                        continue
                    raise exc

        try:
            completion = await _call_parse_with_backoff()
            parsed: Optional[AgreementAnalysis] = completion.choices[0].message.parsed
            if parsed:
                parsed.chat_id = chat_id
                parsed.analysis_id = ensure_uuid(parsed.analysis_id)
                parsed.extraction_engine = "llm"
                return parsed
        except Exception as parse_err:
            logger.info(
                f"{self.provider.upper()} structured parse failed ({type(parse_err).__name__}: {parse_err}), trying JSON mode fallback."
            )

            async def _call_json_mode_with_backoff():
                for attempt in range(3):
                    try:
                        return await client.chat.completions.create(
                            model=self.model,
                            temperature=0,
                            response_format={"type": "json_object"},
                            messages=[
                                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                                {
                                    "role": "user",
                                    "content": user_content + "\nReturn a valid JSON object matching the AgreementAnalysis schema.",
                                },
                            ],
                        )
                    except Exception as exc:
                        exc_name = type(exc).__name__.lower()
                        exc_msg = str(exc).lower()
                        is_rate_or_timeout = (
                            isinstance(exc, (TimeoutError, asyncio.TimeoutError))
                            or "ratelimit" in exc_name
                            or "timeout" in exc_name
                            or "429" in exc_msg
                            or "resource_exhausted" in exc_msg
                        )
                        if is_rate_or_timeout and attempt < 2:
                            delay = delays[attempt]
                            logger.warning(
                                f"LLM API JSON-mode rate limit or timeout ({type(exc).__name__}: {exc}). "
                                f"Retrying in {delay}s (attempt {attempt + 1}/3)..."
                            )
                            await asyncio.sleep(delay)
                            continue
                        raise exc

            response = await _call_json_mode_with_backoff()
            raw_json = response.choices[0].message.content or "{}"
            data = json.loads(raw_json)
            data["chat_id"] = chat_id
            data["analysis_id"] = ensure_uuid(data.get("analysis_id"))
            data["extraction_engine"] = "llm"
            return AgreementAnalysis.model_validate(data)

        return self._deterministic_extract(chat_id, messages, focus_areas)

    async def _call_openai_extractor(
        self, chat_id: str, messages: List[Message], focus_areas: Optional[List[str]] = None
    ) -> AgreementAnalysis:
        """Alias for backward compatibility."""
        return await self._call_llm_extractor(chat_id, messages, focus_areas)

    def _deterministic_extract(
        self, chat_id: str, messages: List[Message], focus_areas: Optional[List[str]] = None
    ) -> AgreementAnalysis:
        """Dynamic extraction engine that parses real conversation messages."""
        analysis_id = str(uuid.uuid4())
        return self._build_dynamic_analysis(chat_id, analysis_id, messages)

    def _evaluate_commercial_deal_gate(
        self, messages: List[Message], unique_senders: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """Evaluate if conversation satisfies bilateral commercial deal requirements."""
        # 1. At least 2 distinct senders
        if len(unique_senders) < 2:
            return False, "Fewer than two distinct participants found in conversation transcript."

        # 2. At least one scope keyword
        has_scope = any(
            any(kw in m.content.lower() for kw in SCOPE_KEYWORDS)
            for m in messages
        )
        if not has_scope:
            return False, "No commercial scope or deliverable keywords detected in conversation."

        # 3. Currency amount mentioned by one sender AND a reply from a different sender within next 3 messages
        # referencing price, budget, rate, fee, charge, cost, or containing acceptance/counter word
        has_price_exchange = False
        for i, msg in enumerate(messages):
            if PRICE_REGEX.search(msg.content):
                sender_i = msg.sender
                for j in range(i + 1, min(i + 4, len(messages))):
                    reply_msg = messages[j]
                    if reply_msg.sender != sender_i:
                        if PRICE_REPLY_REGEX.search(reply_msg.content) or PRICE_REGEX.search(reply_msg.content):
                            has_price_exchange = True
                            break
            if has_price_exchange:
                break

        if not has_price_exchange:
            return (
                False,
                "No bilateral commercial negotiation or exchange of price proposals detected between parties.",
            )

        return True, "Commercial negotiation detected with bilateral consideration and scope."

    def _build_dynamic_analysis(
        self, chat_id: str, analysis_id: str, messages: List[Message]
    ) -> AgreementAnalysis:
        """Dynamic extraction for arbitrary conversations."""
        # 1. Identify Parties & Infer Roles from message content
        unique_senders: List[str] = []
        for m in messages:
            if m.sender not in unique_senders:
                unique_senders.append(m.sender)

        provider_patterns = [
            r"\b(i can handle|i can do|i can design|i can develop|i can build|i normally charge|i'd normally charge|my charge|my fee|my rate|i'll send over|i will deliver|initial mockups|mockups|deliverables|my service fee|50% upfront|upfront)\b",
        ]
        client_patterns = [
            r"\b(my budget|our budget|budget is|can you|can we meet|i need|we need|requirement|requirements|how much|what do you charge)\b",
        ]
        provider_score: Dict[str, int] = {s: 0 for s in unique_senders}
        client_score: Dict[str, int] = {s: 0 for s in unique_senders}
        for m in messages:
            sender = m.sender
            if sender not in provider_score:
                continue
            text = m.content.lower()
            if any(re.search(pat, text, re.IGNORECASE) for pat in provider_patterns):
                provider_score[sender] += 1
            if any(re.search(pat, text, re.IGNORECASE) for pat in client_patterns):
                client_score[sender] += 1

        detected_roles: Dict[str, str] = {}
        if len(unique_senders) == 2:
            s1, s2 = unique_senders[0], unique_senders[1]
            if provider_score[s1] > provider_score[s2] or client_score[s2] > client_score[s1]:
                detected_roles[s1] = "Service Provider"
                detected_roles[s2] = "Client"
            elif provider_score[s2] > provider_score[s1] or client_score[s1] > client_score[s2]:
                detected_roles[s1] = "Client"
                detected_roles[s2] = "Service Provider"
            else:
                detected_roles[s1] = "Client"
                detected_roles[s2] = "Service Provider"
        else:
            for idx, s in enumerate(unique_senders, start=1):
                detected_roles[s] = "Client" if idx == 1 else "Service Provider"

        parties: List[Party] = []
        for idx, s in enumerate(unique_senders, start=1):
            slug = re.sub(r"[^a-z0-9]", "", s.split()[0].lower())[:10] or "user"
            role = detected_roles.get(s, "Client" if idx == 1 else "Service Provider")
            parties.append(
                Party(
                    party_id=f"party_{slug}_{idx:02d}",
                    name=s,
                    detected_role=role,
                    contact_handle=s,
                )
            )

        # 2. Gate check for commercial deal
        is_deal, rationale = self._evaluate_commercial_deal_gate(messages, unique_senders)
        if not is_deal:
            return AgreementAnalysis(
                analysis_id=analysis_id,
                chat_id=chat_id,
                parties=parties,
                extracted_terms=[],
                conflicts=[],
                missing_terms=[],
                confidence_score=0.2,
                requires_human_review=False,
                analyzed_at=datetime.now(timezone.utc),
                is_commercial_deal=False,
                deal_rationale=rationale,
                extraction_engine="fallback",
            )

        # 3. Extract Terms dynamically
        extracted_terms: List[ExtractedTerm] = []

        # Pricing detection: separate base consideration from ancillary/monthly expenses
        price_msgs = self.conflict_detector.extract_price_mentions(messages)
        if price_msgs:
            ancillary_re = re.compile(r"(\bad spend\b|\bfor ads\b|\/month\b|\bper month\b|\bmonthly\b)", re.IGNORECASE)
            base_prices_found: List[str] = []
            base_source_ids: List[str] = []
            all_prices_found: List[str] = []
            all_source_ids: List[str] = []

            for msg, plist in price_msgs:
                all_prices_found.extend(plist)
                all_source_ids.append(msg.message_id)
                if not ancillary_re.search(msg.content):
                    base_prices_found.extend(plist)
                    base_source_ids.append(msg.message_id)

            target_prices = base_prices_found if base_prices_found else all_prices_found
            target_ids = base_source_ids if base_source_ids else all_source_ids

            unique_prices = list(dict.fromkeys(target_prices))
            is_ambiguous = len(unique_prices) > 1
            proposed_str = " / ".join(unique_prices[:-1]) if len(unique_prices) > 1 else unique_prices[0]
            accepted_str = unique_prices[-1]

            extracted_terms.append(
                ExtractedTerm(
                    term_id="term_price_01",
                    category="pricing",
                    description="Total project fee consideration",
                    proposed_value=proposed_str,
                    accepted_value=accepted_str,
                    status=TermStatus.AMBIGUOUS if is_ambiguous else TermStatus.AGREED,
                    source_message_ids=target_ids,
                    confidence=ConfidenceLevel.MEDIUM if is_ambiguous else ConfidenceLevel.HIGH,
                )
            )

        # Upfront payment detection
        for m in messages:
            if any(k in m.content.lower() for k in ["upfront", "advance", "deposit", "% upfront"]):
                extracted_terms.append(
                    ExtractedTerm(
                        term_id="term_payment_01",
                        category="payment_terms",
                        description="Advance payment requirement",
                        proposed_value=m.content.strip(),
                        accepted_value=m.content.strip(),
                        status=TermStatus.AGREED,
                        source_message_ids=[m.message_id],
                        confidence=ConfidenceLevel.HIGH,
                    )
                )
                break

        # Timeline detection: identify deadline, prioritizing committed delivery over casual sign-offs
        timeline_keywords = ["deadline", "by end of", "timeline", "month", "weeks", "friday", "april", "march"]
        timeline_msgs = [m for m in messages if any(k in m.content.lower() for k in timeline_keywords)]
        if timeline_msgs:
            t_ids = [m.message_id for m in timeline_msgs]
            # Prioritize explicit deadline commitments over casual sign-off messages mentioning "next week"
            deadline_markers = ["deadline", "by end of", "done by", "finish by", "complete by", "due by", "deliver by"]
            deadline_candidates = [m for m in timeline_msgs if any(dm in m.content.lower() for dm in deadline_markers)]
            target_accepted_msg = deadline_candidates[-1] if deadline_candidates else timeline_msgs[-1]

            prop_val = clean_timeline_text(timeline_msgs[0].content)
            acc_val = clean_timeline_text(target_accepted_msg.content)

            extracted_terms.append(
                ExtractedTerm(
                    term_id="term_timeline_01",
                    category="timeline",
                    description="Delivery schedule and deadline",
                    proposed_value=prop_val,
                    accepted_value=acc_val,
                    status=TermStatus.AGREED if len(timeline_msgs) <= 2 else TermStatus.AMBIGUOUS,
                    source_message_ids=t_ids,
                    confidence=ConfidenceLevel.MEDIUM,
                )
            )

        # Scope detection
        scope_keywords = ["redesign", "website", "campaign", "posts", "deliverable", "service", "project", "work on"]
        scope_msgs = [m for m in messages if any(k in m.content.lower() for k in scope_keywords)]
        if scope_msgs:
            s_ids = [m.message_id for m in scope_msgs]
            extracted_terms.append(
                ExtractedTerm(
                    term_id="term_scope_01",
                    category="scope",
                    description="Commercial project scope of work",
                    proposed_value=scope_msgs[0].content.strip(),
                    accepted_value=scope_msgs[-1].content.strip(),
                    status=TermStatus.AGREED,
                    source_message_ids=s_ids,
                    confidence=ConfidenceLevel.HIGH,
                )
            )

        # 4. Detect Conflicts under Section 7
        conflicts = self.conflict_detector.detect_conflicts(messages, is_commercial_deal=True)

        # 5. Detect Missing Terms
        missing_terms = self.legal_retriever.detect_missing_terms(extracted_terms, messages, is_commercial_deal=True)

        confidence_score = 0.85 if not conflicts else 0.78

        return AgreementAnalysis(
            analysis_id=analysis_id,
            chat_id=chat_id,
            parties=parties,
            extracted_terms=extracted_terms,
            conflicts=conflicts,
            missing_terms=missing_terms,
            confidence_score=confidence_score,
            requires_human_review=True,
            analyzed_at=datetime.now(timezone.utc),
            is_commercial_deal=True,
            deal_rationale=rationale,
            extraction_engine="fallback",
        )
