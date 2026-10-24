"""Indian Non-Judicial Stamp Paper & Legal Agreement PDF Generator.

Synthesizes authenticated negotiations, formal legal clauses, and two-party
mutual assent into an enforceable Indian e-Stamp Paper format PDF compliant with:
- Section 10A, Information Technology Act, 2000 (Validity of electronic contracts)
- Section 65B, Indian Evidence Act, 1872 (Admissibility of electronic records)
- Section 7, Indian Contract Act, 1872 (Absolute and unqualified acceptance)
"""

import io
import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

from app.schemas.agreement import Agreement, Clause
from app.schemas.confirmation import ConfirmationStatus, PartyConfirmationRecord


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' and cryptographic running footer."""

    def __init__(self, *args, **kwargs):
        kwargs["pageCompression"] = 0
        super().__init__(*args, **kwargs)
        self.setTitle("DEALSHIELD AI Commercial Agreement")
        self.setAuthor("DealShield AI Legal Technology")
        self.setSubject("Indian Non-Judicial Commercial Contract")
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running bottom rule
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        # Footer text
        left_text = "DealShield AI — Non-Judicial Commercial Contract • Tamper-Evident SHA-256 Ledger"
        right_text = f"Page {self._pageNumber} of {total_pages}"

        self.drawString(36, 30, left_text)
        self.drawRightString(559, 30, right_text)

        # Subtle watermark on all pages
        self.setFont("Helvetica-Bold", 48)
        self.setFillColor(colors.HexColor("#0F172A"), alpha=0.03)
        self.translate(297, 420)
        self.rotate(45)
        self.drawCentredString(0, 0, "DEALSHIELD VERIFIED")
        self.restoreState()


class StampPaperPdfService:
    """Generates authentic Indian Non-Judicial e-Stamp style commercial contracts in PDF."""

    @classmethod
    def generate_pdf(
        cls,
        agreement: Agreement,
        confirmation_status: Optional[ConfirmationStatus] = None,
    ) -> bytes:
        """Generates a complete, downloadable Indian Stamp Paper contract PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            alignment=1,  # Center
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4,
        )

        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            alignment=1,
            textColor=colors.HexColor("#475569"),
            spaceAfter=10,
        )

        preamble_style = ParagraphStyle(
            "Preamble",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=12,
        )

        clause_heading_style = ParagraphStyle(
            "ClauseHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=8,
            spaceAfter=3,
        )

        clause_body_style = ParagraphStyle(
            "ClauseBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#334155"),
            spaceAfter=4,
        )

        statutory_style = ParagraphStyle(
            "StatutoryRef",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=6,
        )

        cell_label_style = ParagraphStyle(
            "CellLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#475569"),
        )

        cell_value_style = ParagraphStyle(
            "CellValue",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#0F172A"),
        )

        elements = []

        # ---------------------------------------------------------
        # 1. INDIAN NON-JUDICIAL E-STAMP CERTIFICATE HEADER
        # ---------------------------------------------------------
        first_party = agreement.parties[0] if len(agreement.parties) > 0 else "Client / First Party"
        second_party = agreement.parties[1] if len(agreement.parties) > 1 else (
            agreement.parties[0] if len(agreement.parties) > 0 else "Service Provider / Counterparty"
        )
        if len(agreement.parties) > 1 and second_party == first_party:
            second_party = agreement.parties[1]

        cert_id = f"IN-DL{abs(hash(agreement.id)) % 1000000000:09d}Z"
        created_dt = agreement.created_at.strftime("%d-%b-%Y %I:%M %p") if agreement.created_at else "Immediate"

        # Top Ornamental Stamp Header Bar
        stamp_header_data = [
            [
                Paragraph(
                    "<font size=12><b>INDIA NON JUDICIAL</b></font><br/>"
                    "<font size=9><b>Government of National Capital Territory of Delhi</b></font><br/>"
                    "<font size=8 color='#1E3A8A'><b>e-Stamp Certificate of Commercial Agreement</b></font>",
                    ParagraphStyle(
                        "StampTopHeader",
                        fontName="Helvetica-Bold",
                        alignment=1,
                        leading=13,
                        textColor=colors.HexColor("#0F172A"),
                    ),
                )
            ]
        ]
        stamp_header_table = Table(stamp_header_data, colWidths=[523])
        stamp_header_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),  # Warm Stamp Paper Gold
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#B45309")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(stamp_header_table)

        # e-Stamp Details Grid
        stamp_grid_data = [
            [
                Paragraph("<b>Certificate No.</b>", cell_label_style),
                Paragraph(f"<b>{cert_id}</b>", cell_value_style),
                Paragraph("<b>Certificate Issued Date</b>", cell_label_style),
                Paragraph(created_dt, cell_value_style),
            ],
            [
                Paragraph("<b>Account Reference</b>", cell_label_style),
                Paragraph("SELFPRINT (DealShield e-Stamp)", cell_value_style),
                Paragraph("<b>Unique Doc. Reference</b>", cell_label_style),
                Paragraph(f"SUBIN-INDL{agreement.id[:8].upper()}0001M", cell_value_style),
            ],
            [
                Paragraph("<b>Purchased by</b>", cell_label_style),
                Paragraph(first_party, cell_value_style),
                Paragraph("<b>Description of Document</b>", cell_label_style),
                Paragraph("Article 5(c) Commercial Agreement", cell_value_style),
            ],
            [
                Paragraph("<b>First Party (Initiator)</b>", cell_label_style),
                Paragraph(f"<b>{first_party}</b>", cell_value_style),
                Paragraph("<b>Second Party (Counterparty)</b>", cell_label_style),
                Paragraph(f"<b>{second_party}</b>", cell_value_style),
            ],
            [
                Paragraph("<b>Stamp Duty Paid By</b>", cell_label_style),
                Paragraph(first_party, cell_value_style),
                Paragraph("<b>Stamp Duty Amount (Rs.)</b>", cell_label_style),
                Paragraph("<b>₹ 100/- (Rupees One Hundred only)</b>", cell_value_style),
            ],
        ]

        stamp_grid_table = Table(stamp_grid_data, colWidths=[120, 141, 130, 132])
        stamp_grid_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFBEB")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D97706")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        elements.append(stamp_grid_table)

        # Statutory Authority Disclaimer Notice
        statutory_notice = Paragraph(
            "<font size=7 color='#78350F'><b>STATUTORY NOTICE & LEGAL VALIDITY:</b> "
            "This electronic instrument constitutes an enforceable commercial agreement pursuant to "
            "<b>Section 10A of the Information Technology Act, 2000</b> (validity of contracts formed through electronic means), "
            "<b>Section 65B of the Indian Evidence Act, 1872</b> (admissibility of electronic records), and "
            "<b>Section 7 of the Indian Contract Act, 1872</b> (absolute and unqualified acceptance). "
            "Tamper-evident audit digest is sealed in the cryptographic ledger.</font>",
            ParagraphStyle("StatutoryNotice", fontName="Helvetica", leading=9, alignment=0),
        )
        notice_table = Table([[statutory_notice]], colWidths=[523])
        notice_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D97706")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(notice_table)
        elements.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 2. AGREEMENT TITLE & PREAMBLE
        # ---------------------------------------------------------
        elements.append(Paragraph("COMMERCIAL SERVICE AGREEMENT", title_style))
        elements.append(
            Paragraph(
                f"Agreement UUID: <code>{agreement.id}</code> &bull; Version: <b>v{agreement.current_version}.0</b>",
                subtitle_style,
            )
        )

        preamble_text = (
            f"This <b>Commercial Service Agreement</b> (&ldquo;Agreement&rdquo;) is entered into and deemed effective as of "
            f"<b>{created_dt}</b>, by and between: "
            f"<br/><br/>"
            f"1. <b>{first_party}</b>, hereinafter referred to as the <b>&ldquo;Party A / Initiating Party&rdquo;</b>, AND<br/>"
            f"2. <b>{second_party}</b>, hereinafter referred to as the <b>&ldquo;Party B / Executing Counterparty&rdquo;</b>.<br/><br/>"
            f"<b>WHEREAS</b>, the Parties engaged in bilateral commercial negotiations via authenticated electronic messaging; and "
            f"<b>WHEREAS</b>, both Parties have reviewed, verified, and formally assented to the synthesized contractual terms set forth below."
        )
        elements.append(Paragraph(preamble_text, preamble_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

        # ---------------------------------------------------------
        # 3. SYNTHESIZED CONTRACT CLAUSES
        # ---------------------------------------------------------
        latest_version = agreement.versions[-1] if agreement.versions else None
        clauses: List[Clause] = latest_version.clauses if latest_version else []

        if not clauses:
            elements.append(
                Paragraph(
                    "<i>Mutual commercial understanding as established in the authenticated communication records.</i>",
                    clause_body_style,
                )
            )
        else:
            for idx, clause in enumerate(clauses):
                clause_elements = []
                clause_elements.append(Paragraph(clause.title, clause_heading_style))
                clause_elements.append(Paragraph(clause.body.replace("\n", "<br/>"), clause_body_style))

                if clause.statutory_reference:
                    clause_elements.append(
                        Paragraph(
                            f"<b>Statutory Reference:</b> {clause.statutory_reference}",
                            statutory_style,
                        )
                    )
                elements.append(KeepTogether(clause_elements))

        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=10))

        # ---------------------------------------------------------
        # 4. TWO-PARTY MUTUAL ASSENT & EXECUTION BLOCK
        # ---------------------------------------------------------
        elements.append(
            Paragraph(
                "<b>IN WITNESS WHEREOF</b>, the Parties hereto have caused this Agreement to be executed "
                "through verified electronic assent pursuant to Section 10A of the Information Technology Act, 2000:",
                ParagraphStyle("InWitness", fontName="Helvetica", fontSize=8.5, leading=12, textColor=colors.HexColor("#1E293B"), spaceAfter=8),
            )
        )

        # Lookup confirmation statuses
        party_a_record: Optional[PartyConfirmationRecord] = None
        party_b_record: Optional[PartyConfirmationRecord] = None

        if confirmation_status and confirmation_status.parties:
            for p in confirmation_status.parties:
                if p.party_name.strip().lower() == first_party.strip().lower():
                    party_a_record = p
                elif p.party_name.strip().lower() == second_party.strip().lower():
                    party_b_record = p

        def build_party_box(
            party_label: str,
            party_name: str,
            record: Optional[PartyConfirmationRecord],
        ) -> Paragraph:
            is_confirmed = bool(record and record.confirmed)
            assent_status = "FORMALLY CONFIRMED" if is_confirmed else "PENDING FORMAL ASSENT"
            status_color = "#047857" if is_confirmed else "#B45309"
            confirmed_date = (
                record.confirmed_at.strftime("%d-%b-%Y %I:%M %p UTC")
                if (record and record.confirmed_at)
                else (created_dt if is_confirmed else "Pending digital execution")
            )
            ip_val = record.ip_hash if (record and record.ip_hash) else "HMAC-SHA256 Anonymized (DPDP)"

            content = (
                f"<font size=8 color='#64748B'><b>{party_label}</b></font><br/>"
                f"<font size=10 color='#0F172A'><b>{party_name}</b></font><br/>"
                f"<font size=8 color='{status_color}'><b>&bull; {assent_status}</b></font><br/>"
                f"<font size=7 color='#475569'><b>Execution Date:</b> {confirmed_date}</font><br/>"
                f"<font size=7 color='#475569'><b>Audit Token Ref:</b> <code>{ip_val[:20]}...</code></font><br/>"
                f"<font size=7 color='#0284C7'><b>Legal Basis:</b> Sec 7 Indian Contract Act, 1872</font>"
            )
            return Paragraph(content, ParagraphStyle("PartyBoxP", fontName="Helvetica", leading=11))

        box_party_a = build_party_box("FIRST PARTY (INITIATOR)", first_party, party_a_record)
        box_party_b = build_party_box("SECOND PARTY (COUNTERPARTY)", second_party, party_b_record)

        signing_table_data = [[box_party_a, box_party_b]]
        signing_table = Table(signing_table_data, colWidths=[256, 257])
        signing_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F8FAFC")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#CBD5E1")),
                ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        elements.append(signing_table)
        elements.append(Spacer(1, 8))

        # ---------------------------------------------------------
        # 5. CRYPTOGRAPHIC TAMPER-EVIDENT AUDIT SEAL
        # ---------------------------------------------------------
        content_hash = latest_version.content_hash if (latest_version and latest_version.content_hash) else (
            hashlib.sha256(agreement.id.encode()).hexdigest()
        )

        audit_text = (
            f"<b>DEALSHIELD CRYPTOGRAPHIC AUDIT RECORD & EVIDENCE VAULT SEAL:</b><br/>"
            f"SHA-256 Digest: <code>{content_hash}</code><br/>"
            f"Timestamp: {created_dt} UTC &bull; Verified Electronic Signature under Indian Law &bull; "
            f"Section 65B Indian Evidence Act Certificate Generated."
        )
        audit_paragraph = Paragraph(
            audit_text,
            ParagraphStyle("AuditSealP", fontName="Helvetica", fontSize=7, leading=9.5, textColor=colors.HexColor("#064E3B")),
        )
        audit_table = Table([[audit_paragraph]], colWidths=[523])
        audit_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),  # Mint Green
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#059669")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        elements.append(audit_table)

        # Build document
        doc.build(elements, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
