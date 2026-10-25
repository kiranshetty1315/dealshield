"""Agreement Generator Service (Owned by Team D: Agreements, Database, and Security).

Generates plain-language, legally coherent commercial agreements from verified
analysis terms and resolves contradictions into formal contract clauses.
Supports versioning, SHA-256 fingerprinting, and audit logging.
"""

import uuid
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from app.schemas.agreement import Agreement, AgreementVersion, Clause, AgreementStatus
from app.schemas.analysis import ExtractedTerm
from app.services.ai_extractor import clean_timeline_text
from app.services.hash_service import HashService
from app.db.repository import (
    AgreementRepository,
    ConfirmationRepository,
    AuditRepository,
    EvidenceRepository,
    AnalysisRepository,
)


class AgreementGeneratorService:
    """Generates structured legal agreements and manages versioning & persistence."""

    def __init__(
        self,
        agreement_repo: Optional[AgreementRepository] = None,
        confirmation_repo: Optional[ConfirmationRepository] = None,
        audit_repo: Optional[AuditRepository] = None,
        evidence_repo: Optional[EvidenceRepository] = None,
        analysis_repo: Optional[AnalysisRepository] = None,
    ):
        self.agreement_repo = agreement_repo or AgreementRepository()
        self.confirmation_repo = confirmation_repo or ConfirmationRepository()
        self.audit_repo = audit_repo or AuditRepository()
        self.evidence_repo = evidence_repo or EvidenceRepository()
        self.analysis_repo = analysis_repo or AnalysisRepository()

    def generate_draft(
        self,
        analysis_id: str,
        parties: Optional[List[str]] = None,
        terms: Optional[List[Dict]] = None,
        agreement_id: Optional[str] = None,
    ) -> Agreement:
        """Generate Version 1 draft agreement from structured analysis."""
        analysis = self.analysis_repo.get_analysis(analysis_id)
        client_party = None
        provider_party = None
        if analysis and analysis.parties:
            client_party = next((p.name for p in analysis.parties if p.detected_role and "client" in p.detected_role.lower()), None)
            provider_party = next((p.name for p in analysis.parties if p.detected_role and ("provider" in p.detected_role.lower() or "freelancer" in p.detected_role.lower() or "vendor" in p.detected_role.lower())), None)

        if client_party and provider_party and client_party != provider_party:
            p1 = client_party
            p2 = provider_party
            contracting_parties = [p1, p2]
        elif parties:
            contracting_parties = parties
            p1 = contracting_parties[0] if len(contracting_parties) > 0 else "Client"
            p2 = contracting_parties[1] if len(contracting_parties) > 1 else "Service Provider"
        elif analysis and analysis.parties:
            contracting_parties = [p.name for p in analysis.parties]
            p1 = contracting_parties[0] if len(contracting_parties) > 0 else "Client"
            p2 = contracting_parties[1] if len(contracting_parties) > 1 else "Service Provider"
        else:
            contracting_parties = ["Raj Mehta", "Priya Sharma"]
            p1 = contracting_parties[0]
            p2 = contracting_parties[1]

        # Dynamically synthesize clauses: merge incoming resolved terms over analysis terms
        extracted_terms = []
        if analysis and analysis.extracted_terms:
            extracted_terms = list(analysis.extracted_terms)

        if terms:
            incoming_terms = [
                ExtractedTerm.model_validate(t) if isinstance(t, dict) else t
                for t in terms
            ]
            merged = {t.category: t for t in extracted_terms}
            for it in incoming_terms:
                merged[it.category] = it
            extracted_terms = list(merged.values())

        clauses = []
        if extracted_terms:
            # 1. Scope
            scope_term = next((t for t in extracted_terms if t.category == "scope"), None)
            if scope_term:
                clauses.append(Clause(
                    clause_id="clause_scope_01",
                    title="1. Scope of Work & Deliverables",
                    body=f"{p2} agrees to perform contractual services for {p1}: {scope_term.description}. Delivery specification: {scope_term.accepted_value or scope_term.proposed_value or 'As mutually confirmed'}.",
                    source_term_ids=scope_term.source_message_ids or ["term_scope_01"],
                    statutory_reference="Indian Contract Act, 1872 Section 10 (Lawful Consideration & Object)",
                ))

            # 2. Consideration
            pricing_term = next((t for t in extracted_terms if t.category == "pricing"), None)
            payment_term = next((t for t in extracted_terms if t.category == "payment_terms"), None)
            if pricing_term or payment_term:
                price_val = pricing_term.accepted_value or pricing_term.proposed_value if pricing_term else "As agreed"
                pay_desc = payment_term.description if payment_term else "Payable per agreed milestone schedule"
                src_ids = (pricing_term.source_message_ids if pricing_term else []) + (payment_term.source_message_ids if payment_term else [])
                clauses.append(Clause(
                    clause_id="clause_pricing_02",
                    title="2. Consideration & Commercial Terms",
                    body=f"The agreed commercial consideration payable by {p1} to {p2} is {price_val}. Payment execution terms: {pay_desc}.",
                    source_term_ids=src_ids or ["term_price_01"],
                    statutory_reference="Indian Contract Act, 1872 Section 7 (Absolute Acceptance)",
                ))

            # 3. Timeline
            timeline_term = next((t for t in extracted_terms if t.category == "timeline"), None)
            if timeline_term:
                raw_tl = timeline_term.accepted_value or timeline_term.description
                clean_tl = clean_timeline_text(raw_tl)
                clauses.append(Clause(
                    clause_id="clause_timeline_03",
                    title="3. Project Timeline & Delivery Milestones",
                    body=f"All deliverable commitments shall be completed and submitted by {p2}: {clean_tl}.",
                    source_term_ids=timeline_term.source_message_ids or ["term_timeline_01"],
                ))

            # 4. Other extracted terms
            other_terms = [t for t in extracted_terms if t.category not in ("scope", "pricing", "payment_terms", "timeline")]
            for idx, ot in enumerate(other_terms, start=4):
                clauses.append(Clause(
                    clause_id=f"clause_{ot.category}_{idx:02d}",
                    title=f"{idx}. {ot.category.replace('_', ' ').title()}",
                    body=f"{ot.description}. Agreed specification: {ot.accepted_value or ot.proposed_value or 'Confirmed'}.",
                    source_term_ids=ot.source_message_ids,
                ))

            # 5. IP & Statutory Safeguards
            ip_missing = next((m for m in analysis.missing_terms if "ip" in m.category.lower() or "intellectual" in m.category.lower()), None) if (analysis and analysis.missing_terms) else None
            idx_next = len(clauses) + 1
            clauses.append(Clause(
                clause_id="clause_ip_safeguards",
                title=f"{idx_next}. Intellectual Property & Statutory Safeguards",
                body=(
                    f"All intellectual property rights and copyrights in final deliverable assets shall vest in {p1} upon full consideration receipt. "
                    f"Governed by the laws of India. {ip_missing.recommendation if ip_missing else 'Subject to Indian Contract Act, 1872 and Copyright Act, 1957.'}"
                ),
                source_term_ids=[ip_missing.term_id] if ip_missing else ["missing_ip_01"],
                statutory_reference="Copyright Act, 1957 (Sections 17 & 19) & Indian Contract Act, 1872",
            ))

        if not clauses:
            # Fallback standard clauses
            clauses = [
                Clause(
                    clause_id="clause_scope_01",
                    title="1. Scope of Work & Deliverables",
                    body=f"{p2} agrees to perform contractual services for {p1} as negotiated.",
                    source_term_ids=["term_scope_01"],
                    statutory_reference="Indian Contract Act, 1872 Section 10",
                ),
                Clause(
                    clause_id="clause_pricing_02",
                    title="2. Consideration & Commercial Terms",
                    body=f"Commercial consideration payable by {p1} to {p2} as agreed in source transcript.",
                    source_term_ids=["term_price_01"],
                    statutory_reference="Indian Contract Act, 1872 Section 7",
                ),
                Clause(
                    clause_id="clause_timeline_03",
                    title="3. Project Timeline & Delivery Milestones",
                    body="Deliverables shall be completed and submitted according to agreed project milestones.",
                    source_term_ids=["term_timeline_01"],
                ),
                Clause(
                    clause_id="clause_ip_04",
                    title="4. Intellectual Property & Governing Law",
                    body=f"All intellectual property rights shall vest in {p1} upon full payment. Governed by the laws of India.",
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
        v1_id = agreement.versions[0].id if (agreement.versions and agreement.versions[0].id) else agreement.id
        self.confirmation_repo.create_confirmation_tokens(
            agreement_id=agreement.id,
            version_id=v1_id,
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
        base_text = self._compile_plain_text(agreement.parties, clauses)

        # Append plain text Certificate of Assent if confirmation records exist
        try:
            conf_status = self.confirmation_repo.get_confirmation_status(agreement.id)
            if conf_status and conf_status.parties:
                lines = [
                    base_text,
                    "\n==================================================",
                    "CERTIFICATE OF ASSENT",
                    "==================================================",
                ]
                for p in conf_status.parties:
                    status_str = "CONFIRMED" if p.confirmed else ("DECLINED" if p.declined else "PENDING")
                    lines.append(f"Party: {p.party_name}")
                    if p.masked_email:
                        lines.append(f"Email: {p.masked_email}")
                    lines.append(f"Status: {status_str}")
                    if p.confirmed and p.confirmed_at:
                        lines.append(f"Confirmed At: {p.confirmed_at.isoformat()} UTC")
                        lines.append(f"Verification Method: {p.verification_method or 'email_otp'}")
                    if p.declined and p.decline_reason:
                        lines.append(f"Decline Reason: {p.decline_reason}")
                    if p.ip_hash:
                        lines.append(f"Audit IP Prefix: {p.ip_hash[:12]}...")
                    lines.append("--------------------------------------------------")
                return "\n".join(lines)
        except Exception:
            pass

        return base_text
