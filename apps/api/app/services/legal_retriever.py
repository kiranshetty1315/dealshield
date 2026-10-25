"""Legal Reference Retriever Service (Owned by Team C: AI and Legal Intelligence).

Retrieves statutory rules, judicial precedents, and mandatory clauses
from Indian commercial law (e.g., Indian Contract Act 1872, Copyright Act 1957,
Information Technology Act 2000) to enrich agreement analysis and generation.
"""

import os
from typing import Any, Dict, List, Optional
from app.schemas.analysis import ExtractedTerm, MissingTerm, ImportanceLevel
from app.schemas.chat import Message


# Curated Indian Statutory Standards
INDIAN_STATUTORY_STANDARDS: Dict[str, Dict[str, Any]] = {
    "ica_s2h_s10": {
        "statute": "Indian Contract Act, 1872",
        "sections": ["Section 2(h)", "Section 10"],
        "title": "Lawful Consideration and Mutual Consent",
        "statutory_text": (
            "Section 2(h): An agreement enforceable by law is a contract. "
            "Section 10: All agreements are contracts if they are made by the free consent "
            "of parties competent to contract, for a lawful consideration and with a lawful object."
        ),
        "relevance": (
            "Every commercial agreement requires reciprocal promises forming lawful consideration. "
            "In informal conversations, fixed consideration and deliverables must be clearly defined."
        ),
        "safeguard_required": "Defined consideration, payment triggers, and reciprocal obligations.",
    },
    "ica_s7": {
        "statute": "Indian Contract Act, 1872",
        "sections": ["Section 7"],
        "title": "Absolute and Unqualified Acceptance",
        "statutory_text": (
            "In order to convert a proposal into a promise the acceptance must— (1) be absolute and unqualified; "
            "(2) be expressed in some usual and reasonable manner."
        ),
        "relevance": (
            "Under Indian commercial law, equivocal phrases ('that works I think', 'depends on timeline') "
            "do not create a binding promise. They operate as counter-offers or invitations to treat."
        ),
        "safeguard_required": "Unconditional, unhedged mutual confirmation of all material terms.",
    },
    "ica_s73": {
        "statute": "Indian Contract Act, 1872",
        "sections": ["Section 73"],
        "title": "Compensation for Loss or Damage Caused by Breach of Contract",
        "statutory_text": (
            "When a contract has been broken, the party who suffers by such breach is entitled to receive, "
            "from the party who has broken the contract, compensation for any loss or damage caused to him thereby, "
            "which naturally arose in the usual course of things from such breach."
        ),
        "relevance": (
            "Protects parties upon premature project termination, work-in-progress abandonment, or milestone breach. "
            "Requires explicit notice periods and payment for delivered work."
        ),
        "safeguard_required": "7-day termination notice with fair compensation for work-in-progress.",
    },
    "copyright_act_1957": {
        "statute": "Copyright Act, 1957",
        "sections": ["Section 17", "Section 19"],
        "title": "Assignment of Intellectual Property upon Consideration",
        "statutory_text": (
            "Section 17: Subject to the provisions of this Act, the author of a work shall be the first owner of the copyright. "
            "Section 19: No assignment of the copyright in any work shall be valid unless it is in writing signed by the assignor."
        ),
        "relevance": (
            "Freelancers/contractors retain copyright in code, designs, and content unless explicitly assigned in writing. "
            "Clients must secure written assignment conditioned upon 100% receipt of agreed consideration."
        ),
        "safeguard_required": "Full assignment of IP and source files to Client upon complete payment.",
    },
    "it_act_2000": {
        "statute": "Information Technology Act, 2000",
        "sections": ["Section 10A"],
        "title": "Validity of Contracts Formed Through Electronic Means",
        "statutory_text": (
            "Where in a contract formation, the communication of proposals, the acceptance of proposals, "
            "the revocation of proposals and acceptances are expressed in electronic form or by means of an electronic record, "
            "such contract shall not be deemed to be unenforceable solely on the ground that such electronic form or means was used."
        ),
        "relevance": "Provides legal legitimacy to contracts agreed over WhatsApp and electronic messaging in India.",
        "safeguard_required": "Cryptographic timestamping and immutable audit log of communication records.",
    },
    "stamp_act_1899": {
        "statute": "Indian Stamp Act, 1899",
        "sections": ["Section 35"],
        "title": "Stamp Duty and Evidentiary Admissibility",
        "statutory_text": (
            "No instrument chargeable with duty shall be admitted in evidence for any purpose by any person having by law "
            "or consent of parties authority to receive evidence, or shall be acted upon, registered or authenticated by any such person, "
            "unless such instrument is duly stamped."
        ),
        "relevance": (
            "DealShield summaries are plain-language term sheets. Parties must be advised that judicial admissibility in civil courts "
            "requires payment of state stamp duty."
        ),
        "safeguard_required": "Evidentiary disclaimer on document export regarding stamp duty requirements.",
    },
}


class LegalRetrieverService:
    """Retrieval service for curated Indian legal templates and statutory references."""

    def __init__(self, references_path: str = "legal-knowledge/references"):
        self.references_path = references_path

    def get_statutory_standards(self) -> Dict[str, Dict[str, Any]]:
        """Retrieve all curated Indian statutory standards."""
        return INDIAN_STATUTORY_STANDARDS

    def get_statutory_standard(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve specific statutory standard by key (e.g., 'ica_s7', 'copyright_act_1957')."""
        return INDIAN_STATUTORY_STANDARDS.get(key)

    def get_mandatory_clauses(self, contract_type: str = "service_agreement") -> List[Dict[str, Any]]:
        """Retrieve essential statutory and commercial clauses under Indian law."""
        return [
            {
                "clause_id": "std_clause_scope",
                "title": "Scope of Work & Deliverables",
                "category": "scope",
                "statutory_basis": "Indian Contract Act, 1872 Section 10",
                "description": "Clear enumeration of deliverables, milestones, and acceptance criteria.",
                "importance": "critical",
            },
            {
                "clause_id": "std_clause_consideration",
                "title": "Consideration & Payment Milestones",
                "category": "pricing",
                "statutory_basis": "Indian Contract Act, 1872 Section 2(h) & Section 10",
                "description": "Fixed total compensation, advance payments, and milestone disbursement triggers.",
                "importance": "critical",
            },
            {
                "clause_id": "std_clause_acceptance",
                "title": "Absolute Acceptance",
                "category": "acceptance",
                "statutory_basis": "Indian Contract Act, 1872 Section 7",
                "description": "Explicit unqualified agreement by both parties without reservation.",
                "importance": "critical",
            },
            {
                "clause_id": "std_clause_ip",
                "title": "Intellectual Property & Copyright Assignment",
                "category": "intellectual_property",
                "statutory_basis": "Copyright Act, 1957 Section 17 & Section 19",
                "description": "Assignment of copyright and deliverable ownership upon receipt of consideration.",
                "importance": "critical",
            },
            {
                "clause_id": "std_clause_termination",
                "title": "Termination Notice & WIP Remedies",
                "category": "termination",
                "statutory_basis": "Indian Contract Act, 1872 Section 73",
                "description": "Notice period for termination and compensation for work completed prior to notice.",
                "importance": "important",
            },
            {
                "clause_id": "std_clause_dispute",
                "title": "Governing Law & Dispute Resolution",
                "category": "dispute_resolution",
                "statutory_basis": "Arbitration and Conciliation Act, 1996",
                "description": "Jurisdiction of Indian courts and mutual dispute resolution mechanism.",
                "importance": "recommended",
            },
        ]

    def detect_missing_terms(
        self,
        extracted_terms: List[ExtractedTerm],
        messages: Optional[List[Message]] = None,
        include_recommended: bool = False,
        is_commercial_deal: bool = True,
    ) -> List[MissingTerm]:
        """Detect missing statutory and commercial safeguards against Indian commercial standards.
        
        Evaluates presence of:
        - Intellectual Property assignment (Copyright Act 1957)
        - Termination and Work-in-Progress remedies (Indian Contract Act Section 73)
        - Dispute resolution / governing law (recommended)
        """
        if not is_commercial_deal:
            return []

        existing_categories = {t.category.lower() for t in extracted_terms}
        
        # Also inspect message content if provided
        all_text = ""
        if messages:
            all_text = " ".join(m.content for m in messages).lower()

        missing: List[MissingTerm] = []

        # 1. Intellectual Property Ownership (Copyright Act 1957)
        has_ip = (
            "intellectual_property" in existing_categories
            or "ip" in existing_categories
            or any("intellectual property" in t.description.lower() or "copyright" in t.description.lower() for t in extracted_terms)
            or "copyright" in all_text
            or "ip rights" in all_text
            or "ownership of code" in all_text
        )
        if not has_ip:
            missing.append(
                MissingTerm(
                    term_id="missing_ip_01",
                    category="intellectual_property",
                    description="No assignment of IP rights on source code and design files",
                    importance=ImportanceLevel.CRITICAL,
                    recommendation="Assign IP to Client upon full receipt of consideration.",
                )
            )

        # 2. Termination Notice & WIP Remedies (ICA Section 73)
        has_termination = (
            "termination" in existing_categories
            or "cancellation" in existing_categories
            or any("termination" in t.description.lower() or "cancellation" in t.description.lower() for t in extracted_terms)
            or "terminate" in all_text
            or "cancellation policy" in all_text
            or "notice period" in all_text
        )
        if not has_termination:
            missing.append(
                MissingTerm(
                    term_id="missing_termination_01",
                    category="termination",
                    description="No cancellation or work-in-progress compensation clause",
                    importance=ImportanceLevel.IMPORTANT,
                    recommendation="Add 7-day termination notice with payment for delivered work.",
                )
            )

        # 3. Dispute Resolution & Governing Law (Arbitration & Conciliation Act 1996)
        if include_recommended:
            has_dispute = (
                "dispute_resolution" in existing_categories
                or "governing_law" in existing_categories
                or any("dispute" in t.description.lower() or "jurisdiction" in t.description.lower() for t in extracted_terms)
                or "dispute resolution" in all_text
                or "arbitration" in all_text
            )
            if not has_dispute:
                missing.append(
                    MissingTerm(
                        term_id="missing_dispute_01",
                        category="dispute_resolution",
                        description="No governing law, jurisdiction, or dispute resolution mechanism specified",
                        importance=ImportanceLevel.RECOMMENDED,
                        recommendation="Specify governing law as Indian Law with seat of arbitration or court jurisdiction.",
                    )
                )

        return missing
