"""Conflict Detector Service (Owned by Team C: AI and Legal Intelligence).

Detects contradictory terms, price mismatches, and ambiguous acceptances
(e.g., "I think that works", "depending on timeline", "let me think about it")
with explicit references to source message IDs.
"""

from typing import List
from app.schemas.analysis import ConflictItem
from app.schemas.chat import Message


class ConflictDetectorService:
    """Detects discrepancies and ambiguous agreement markers across conversation turns."""

    def detect_conflicts(self, messages: List[Message]) -> List[ConflictItem]:
        """Analyze message exchanges for pricing disagreements and ambiguous acceptance.
        
        Detailed ML / LLM pipeline owned by Team C.
        """
        raise NotImplementedError(
            "Conflict detection service implementation pending Team C integration. "
            "See docs/team-tasks.md for specifications."
        )
