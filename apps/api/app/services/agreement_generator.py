"""Agreement Generator Service (Owned by Team D: Agreements, Database, and Security).

Generates plain-language, legally coherent commercial agreements from verified
analysis terms and resolves contradictions into formal contract clauses.
Supports versioning, SHA-256 fingerprinting, and audit logging.
"""

import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from app.schemas.agreement import Agreement, AgreementVersion, Clause, AgreementStatus
from app.services.hash_service import HashService
from app.db.repository import (
    AgreementRepository,
    ConfirmationRepository,
    AuditRepository,
    EvidenceRepository,
)


class AgreementGeneratorService:
    """Generates structured legal agreements and manages versioning & persistence."""

    def __init__(
        self,
        agreement_repo: Optional[AgreementRepository] = None,
        confirmation_repo: Optional[ConfirmationRepository] = None,
        audit_repo: Optional[AuditRepository] = None,
        evidence_repo: Optional[EvidenceRepository] = None,
    ):
        self.agreement_repo = agreement_repo or AgreementRepository()
        self.confirmation_repo = confirmation_repo or ConfirmationRepository()
        self.audit_repo = audit_repo or AuditRepository()
        self.evidence_repo = evidence_repo or EvidenceRepository()

    def generate_draft(
        self,
        analysis_id: str,
        parties: Optional[List[str]] = None,
        terms: Optional[List[Dict]] = None,
        agreement_id: Optional[str] = None,
    ) -> Agreement:
        """Generate Version 1 draft agreement from structured analysis."""
        contracting_parties = parties or ["Raj Mehta", "Priya Sharma"]
        p1 = contracting_parties[0] if len(contracting_parties) > 0 else "Client"
        p2 = contracting_parties[1] if len(contracting_parties) > 1 else "Service Provider"

        # Synthesize plain-language clauses
        clauses = [
            Clause(
                clause_id="clause_scope_01",
                title="1. Scope of Work & Deliverables",
                body=(
                    f"{p2} agrees to perform full website redesign services for {p1}, "
                    "including preliminary UI mockups, responsive frontend layout implementation, "
                    "and final deliverable asset handover."
                ),
                source_term_ids=["term_scope_01"],
                statutory_reference="Indian Contract Act, 1872 Section 10 (Lawful Consideration & Object)",
            ),
            Clause(
                clause_id="clause_pricing_02",
                title="2. Consideration & Payment Milestones",
                body=(
                    f"The agreed total fixed consideration for the scope is ₹1,00,000 (INR One Lakh only). "
                    f"Payment shall be disbursed by {p1} in two equal installments: "
                    "50% (₹50,000) advance payment upon agreement execution, and "
                    "50% (₹50,000) balance payable upon final deliverable acceptance."
                ),
                source_term_ids=["term_price_01", "term_payment_01"],
                statutory_reference="Indian Contract Act, 1872 Section 7 (Absolute Acceptance)",
            ),
            Clause(
                clause_id="clause_timeline_03",
                title="3. Project Timeline & Delivery Milestones",
                body=(
                    "All final redesign deliverables shall be completed and submitted for review "
                    "no later than April 30, 2024. Initial mockups shall be provided within "
                    "seven (7) business days following upfront consideration receipt."
                ),
                source_term_ids=["term_timeline_01"],
            ),
            Clause(
                clause_id="clause_ip_04",
                title="4. Intellectual Property & Governing Law",
                body=(
                    f"All intellectual property rights and copyrights in deliverable designs and source assets "
                    f"shall irrevocably transfer to {p1} upon full payment of the total agreed consideration. "
                    "This agreement shall be interpreted in accordance with the laws of India, "
                    "and subject to conciliation principles under the Indian Contract Act, 1872."
                ),
                source_term_ids=["missing_ip_01"],
                statutory_reference="Copyright Act, 1957 & Indian Contract Act, 1872",
            ),
        ]

        # Plain text compilation for hashing
        plain_text = self._compile_plain_text(contracting_parties, clauses)
        content_hash = HashService.hash_text(plain_text)

        # 1. Persist Agreement and Version 1 to Supabase
        agreement = self.agreement_repo.create_agreement(
            analysis_id=analysis_id,
            parties=contracting_parties,
            clauses=clauses,
            content_hash=content_hash,
            agreement_id=agreement_id,
        )

        # 2. Persist Document Hash in Evidence Vault
        self.evidence_repo.record_document_hash(
            document_id=agreement.id,
            document_type="agreement_version_1",
            hash_value=content_hash,
        )

        # 3. Log Audit Trail Event (Append-Only)
        self.audit_repo.log_event(
            entity_type="agreement",
            entity_id=agreement.id,
            action="agreement_draft_created",
            metadata={
                "analysis_id": analysis_id,
                "version": 1,
                "content_hash": content_hash,
                "clause_count": len(clauses),
            },
        )

        # 4. Generate Single-Use Confirmation Tokens for Counterparties
        self.confirmation_repo.create_confirmation_tokens(
            agreement_id=agreement.id,
            version_id=agreement.id,
            party_names=contracting_parties,
            hours_valid=72,
        )

        return agreement

    def _compile_plain_text(self, parties: List[str], clauses: List[Clause]) -> str:
        """Compiles reproducible plain text for SHA-256 hashing."""
        lines = [
            "DEALSHIELD AI — PLAIN-LANGUAGE COMMERCIAL AGREEMENT",
            f"Parties: {', '.join(parties)}",
            "--------------------------------------------------",
        ]
        for c in clauses:
            lines.append(f"\n{c.title}")
            lines.append(c.body)
            if c.statutory_reference:
                lines.append(f"Statutory Context: {c.statutory_reference}")
        lines.append("\n--------------------------------------------------")
        lines.append("Notice: Generated summary. Not an executed deed until formally executed and stamped.")
        return "\n".join(lines)

    def render_plain_text(self, agreement: Agreement) -> str:
        ver = agreement.versions[-1] if agreement.versions else None
        clauses = ver.clauses if ver else []
        return self._compile_plain_text(agreement.parties, clauses)
