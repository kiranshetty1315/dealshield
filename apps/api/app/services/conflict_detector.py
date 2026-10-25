"""Conflict Detector Service (Owned by Team C: AI and Legal Intelligence).

LEGAL DIFFERENTIATOR & STATUTORY FOUNDATION:
Section 7 of the Indian Contract Act, 1872 provides:
    "Acceptance must be absolute and unqualified. In order to convert a proposal
     into a promise the acceptance must— (1) be absolute and unqualified..."

Under Indian commercial law, conditional or equivocal statements such as:
- "Sure, that works I think. Let's go ahead"
- "I could consider that, but it depends on the timeline"
- "Wait, I thought that was included"
do NOT constitute legal acceptance; they operate as counter-proposals or conditional
negotiations. DealShield AI's conflict detector explicitly flags these hedges under Section 7.
"""

import re
from typing import Dict, List, Optional, Set, Tuple
from app.schemas.analysis import ConflictItem, ConflictSeverity
from app.schemas.chat import Message


# Heuristic markers for Section 7 qualified acceptance detection under Indian Contract Act, 1872
SECTION_7_QUALIFIER_PATTERNS = [
    r"\bi think\b",
    r"\bdepending on\b",
    r"\bdepends on\b",
    r"\bmight be able\b",
    r"\bcould consider\b",
    r"\blet me think\b",
    r"\bthought that was included\b",
    r"\bwait,\b",
    r"\bwait\b",
    r"\bif possible\b",
    r"\bsubject to\b",
    r"\btentatively\b",
    r"\bprobably\b",
    r"\bmaybe\b",
    r"\bas long as\b",
    r"\bprovided that\b",
    r"\blet me check\b",
    r"\bget back to you\b",
]

# Regex pattern for Indian Rupee amounts (e.g. ₹75,000, ₹1,50,000, Rs. 100000, INR 50,000)
PRICE_REGEX = re.compile(
    r"(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+)",
    re.IGNORECASE,
)


class ConflictDetectorService:
    """Detects discrepancies, price counter-proposals, and Section 7 qualified acceptances."""

    def __init__(self):
        self.qualifier_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in SECTION_7_QUALIFIER_PATTERNS
        ]

    def find_qualifiers(self, text: str) -> List[str]:
        """Find any Section 7 qualified acceptance hedge phrases in the text."""
        matches = []
        for pattern in self.qualifier_patterns:
            found = pattern.findall(text)
            if found:
                matches.extend(found)
        return matches

    def extract_price_mentions(self, messages: List[Message]) -> List[Tuple[Message, List[str]]]:
        """Extract all prices mentioned per message with normalized values."""
        results = []
        for msg in messages:
            prices = PRICE_REGEX.findall(msg.content)
            if prices:
                # Format with currency symbol
                formatted_prices = [f"₹{p.strip()}" for p in prices]
                results.append((msg, formatted_prices))
        return results

    def detect_conflicts(self, messages: List[Message]) -> List[ConflictItem]:
        """Analyze message exchanges for pricing disagreements, counter-offers, and ambiguous acceptance.
        
        Anchored on Section 7 of the Indian Contract Act, 1872.
        """
        if not messages:
            return []

        conflicts: List[ConflictItem] = []

        # 1. Detect Pricing Conflicts & Counter-Proposals
        pricing_conflict = self._detect_pricing_conflict(messages)
        if pricing_conflict:
            conflicts.append(pricing_conflict)

        # 2. Detect Scope / Inclusion Conflicts
        scope_conflict = self._detect_scope_inclusion_conflict(messages)
        if scope_conflict:
            conflicts.append(scope_conflict)

        # 3. Detect Standalone Section 7 Qualified Acceptances
        general_hedges = self._detect_hedged_acceptances(messages, existing_conflicts=conflicts)
        conflicts.extend(general_hedges)

        return conflicts

    def _detect_pricing_conflict(self, messages: List[Message]) -> Optional[ConflictItem]:
        """Detect multi-party price counter-offers and hedged settlement."""
        price_msgs = self.extract_price_mentions(messages)
        if not price_msgs:
            return None

        # Collect distinct prices mentioned
        distinct_prices: List[str] = []
        for _, prices in price_msgs:
            for p in prices:
                if p not in distinct_prices:
                    distinct_prices.append(p)

        # If 2 or more distinct prices are proposed, or price is hedged
        parties_involved: Dict[str, Dict[str, Tuple[Message, str]]] = {}
        for msg, prices in price_msgs:
            parties_involved.setdefault(msg.sender, {})[msg.message_id] = (msg, ", ".join(prices))

        # Check if there is price variation or negotiation
        has_multiple_prices = len(distinct_prices) >= 2
        has_hedge_near_price = False
        source_message_ids: List[str] = [msg.message_id for msg, _ in price_msgs]

        # Scan surrounding messages for acceptance hedges
        for msg in messages:
            qualifiers = self.find_qualifiers(msg.content)
            if qualifiers:
                has_hedge_near_price = True
                if msg.message_id not in source_message_ids:
                    source_message_ids.append(msg.message_id)
                if msg.message_id not in parties_involved.get(msg.sender, {}):
                    parties_involved.setdefault(msg.sender, {})[msg.message_id] = (msg, "hedged statement")

        if has_multiple_prices or has_hedge_near_price:
            party_positions: Dict[str, str] = {}
            for sender, msg_map in parties_involved.items():
                entries = list(msg_map.values())
                quoted = [f"{e[1]} ({e[0].content.strip()})" if e[1] != "hedged statement" else e[0].content.strip() for e in entries]
                party_positions[sender] = f"Proposed/discussed: {'; '.join(quoted[:4])}"

            if len(distinct_prices) >= 3:
                prices_str = f"{', '.join(distinct_prices[:-1])} and {distinct_prices[-1]}"
            elif len(distinct_prices) == 2:
                prices_str = f"{distinct_prices[0]} and {distinct_prices[1]}"
            elif distinct_prices:
                prices_str = distinct_prices[0]
            else:
                prices_str = "disputed consideration"
            final_price = distinct_prices[-1] if distinct_prices else "the proposed amount"

            statutory_notes = (
                "Indian Contract Act, 1872 Section 7: Acceptance must be absolute and unqualified. "
                "Counter-proposals discharge the original offer until mutually ratified."
            )
            hedged_quotes = [e[0].content.strip() for msg_map in parties_involved.values() for e in msg_map.values() if e[1] == "hedged statement"]
            if hedged_quotes:
                statutory_notes += f" Qualified statements ({'; '.join(repr(q) for q in hedged_quotes)}) introduce legal ambiguity under Section 7."

            return ConflictItem(
                conflict_id="conflict_price_01",
                term_category="pricing",
                description=f"Price disagreement between {prices_str} settled at {final_price} with ambiguous acceptance",
                party_positions=party_positions,
                source_message_ids=source_message_ids,
                severity=ConflictSeverity.HIGH,
                resolution_suggestion=f"Confirm total fixed consideration at {final_price} with clear milestone payment terms.",
                statutory_context=statutory_notes,
            )
        return None

    def _detect_scope_inclusion_conflict(self, messages: List[Message]) -> Optional[ConflictItem]:
        """Detect misunderstandings about scope inclusion (e.g. ad spend vs fee)."""
        inclusion_indicators = [
            r"thought that was included",
            r"separate",
            r"base package",
            r"changes the budget",
            r"not included",
            r"in addition to",
        ]
        regex = re.compile("|".join(inclusion_indicators), re.IGNORECASE)

        flagged_messages: List[Message] = []
        for msg in messages:
            if regex.search(msg.content):
                flagged_messages.append(msg)

        if flagged_messages:
            source_ids = [m.message_id for m in flagged_messages]
            party_positions: Dict[str, str] = {}
            for m in flagged_messages:
                party_positions[m.sender] = m.content.strip()

            return ConflictItem(
                conflict_id="conflict_scope_01",
                term_category="scope",
                description="Disagreement regarding scope inclusions and additional fee components",
                party_positions=party_positions,
                source_message_ids=source_ids,
                severity=ConflictSeverity.HIGH,
                resolution_suggestion="Itemize exact deliverables included in the base fee and specify any separate variable costs.",
                statutory_context=(
                    "Indian Contract Act, 1872 Section 10 & Section 7: Mutual consent (consensus ad idem) "
                    "and absolute acceptance are required on all material terms."
                ),
            )
        return None

    def _detect_hedged_acceptances(
        self, messages: List[Message], existing_conflicts: List[ConflictItem]
    ) -> List[ConflictItem]:
        """Detect standalone Section 7 qualified acceptances not already cited in pricing or scope."""
        already_cited: Set[str] = set()
        for c in existing_conflicts:
            already_cited.update(c.source_message_ids)

        hedged_conflicts: List[ConflictItem] = []
        for idx, msg in enumerate(messages, start=1):
            if msg.message_id in already_cited:
                continue

            qualifiers = self.find_qualifiers(msg.content)
            if qualifiers:
                # Check if this message was attempting to accept or conclude a term
                lower = msg.content.lower()
                is_acceptance_intent = any(
                    w in lower for w in ["sure", "ok", "sounds good", "works", "go ahead", "consider", "deal", "agree"]
                )
                if is_acceptance_intent or any(q in ["thought that was included", "let me think", "depends on"] for q in qualifiers):
                    hedged_conflicts.append(
                        ConflictItem(
                            conflict_id=f"conflict_hedge_{idx:02d}",
                            term_category="acceptance",
                            description=f"Qualified statement introduces legal ambiguity: '{msg.content.strip()}'",
                            party_positions={msg.sender: msg.content.strip()},
                            source_message_ids=[msg.message_id],
                            severity=ConflictSeverity.MEDIUM,
                            resolution_suggestion="Obtain unequivocal, written sign-off without conditional hedges.",
                            statutory_context=(
                                "Indian Contract Act, 1872 Section 7: Acceptance must be absolute and unqualified. "
                                f"The hedge '{qualifiers[0]}' fails to meet the threshold of an unconditional promise."
                            ),
                        )
                    )

        return hedged_conflicts
