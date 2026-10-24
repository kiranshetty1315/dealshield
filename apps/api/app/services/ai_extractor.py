"""AI Extractor Service Interface (Owned by Team C: AI and Legal Intelligence).

This service is responsible for integrating with OpenAI structured outputs to extract:
- Identified parties and roles
- Proposed and accepted pricing
- Deadlines and milestones
- Payment conditions and deliverables
- Missing terms against Indian standard commercial contracts
"""

from typing import List, Optional
from app.schemas.analysis import AgreementAnalysis, Party, ExtractedTerm, MissingTerm
from app.schemas.chat import Message
from app.core.config import settings


class AIExtractorService:
    """Service boundary for OpenAI LLM structured analysis."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL

    async def analyze_chat(
        self, chat_id: str, messages: List[Message], focus_areas: Optional[List[str]] = None
    ) -> AgreementAnalysis:
        """Extract structured agreement terms using OpenAI structured outputs.
        
        NOTE: Full OpenAI integration is reserved for Team C implementation.
        When credentials are absent or during early scaffold, this raises NotImplementedError
        to prevent fake completed results.
        """
        if not self.api_key or self.api_key.startswith("sk-placeholder"):
            raise NotImplementedError(
                "OpenAI structured extraction requires valid OPENAI_API_KEY in .env. "
                "Assigned to Team C (AI & Legal Intelligence). See docs/team-tasks.md"
            )

        # Future Team C implementation:
        # client = OpenAI(api_key=self.api_key)
        # completion = client.beta.chat.completions.parse(...)
        raise NotImplementedError("OpenAI extractor implementation pending Team C integration.")
