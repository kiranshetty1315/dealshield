from datetime import datetime, timezone
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, Response
from app.schemas.agreement import Agreement, AgreementCreateRequest
from app.services.agreement_generator import AgreementGeneratorService
from app.services.hash_service import HashService
from app.core.config import settings
from app.api.deps import get_optional_current_user
from app.db.repository import (
    AgreementRepository,
    AnalysisRepository,
    ConfirmationRepository,
    user_owns_agreement,
)

router = APIRouter(prefix="/agreements", tags=["Agreements"])

agreement_repo = AgreementRepository()
generator_service = AgreementGeneratorService()
analysis_repo = AnalysisRepository()


def check_agreement_access(
    agreement_id: str,
    current_user: Optional[dict] = None,
    x_review_session: Optional[str] = None,
) -> bool:
    """Verifies that caller has authorization to view or download agreement record."""
    if agreement_id == "sample-agreement-uuid" and settings.ENVIRONMENT == "development":
        return True

    if current_user and user_owns_agreement(agreement_repo.client, current_user["id"], agreement_id):
        return True

    if x_review_session:
        session_hash = ConfirmationRepository.hash_sha256(x_review_session)
        res = (
            agreement_repo.client.table("confirmations")
            .select("id, session_expires_at")
            .eq("agreement_id", agreement_id)
            .eq("session_token_hash", session_hash)
            .execute()
        )
        data = res.data if isinstance(res.data, list) else ([res.data] if res.data else [])
        if data and data[0]:
            exp_iso = data[0].get("session_expires_at")
            if exp_iso:
                exp_dt = datetime.fromisoformat(exp_iso.replace("Z", "+00:00"))
                if exp_dt > datetime.now(timezone.utc):
                    return True

    if settings.ENVIRONMENT == "development" and not current_user and not x_review_session:
        return True

    return False



@router.post(
    "",
    response_model=Agreement,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Agreement Draft",
    description="Transforms extracted analysis terms into plain-language legal clauses and persists to Supabase.",
)
async def create_agreement(request: AgreementCreateRequest) -> Agreement:
    """Generate initial draft agreement and persist to database."""
    agreement = generator_service.generate_draft(
        analysis_id=request.analysis_id,
        parties=request.parties,
    )
    return agreement


@router.get(
    "/chat/{chat_id}",
    response_model=Agreement,
    summary="Get or Generate Agreement by Chat ID",
    description="Retrieves existing agreement draft for a conversation or automatically synthesizes one from analysis.",
)
async def get_agreement_by_chat(chat_id: str) -> Agreement:
    """Retrieve agreement for conversation or generate on-the-fly."""
    # 1. Look up analysis for this chat
    analysis = analysis_repo.get_analysis_by_chat_id(chat_id)
    if not analysis:
        from app.api.routes.analysis import analyze_chat
        from app.schemas.analysis import AnalysisRequest
        analysis = await analyze_chat(AnalysisRequest(chat_id=chat_id))

    # 2. Check if an agreement already exists for this analysis_id
    res = agreement_repo.client.table("agreements").select("*").eq("analysis_id", analysis.analysis_id).execute()
    data = res.data if isinstance(res.data, list) else ([res.data] if res.data else [])
    if data and data[0]:
        return agreement_repo.get_agreement(data[0]["id"])

    # 3. Otherwise synthesize draft agreement
    party_names = [p.name for p in analysis.parties] if analysis.parties else None
    return generator_service.generate_draft(analysis_id=analysis.analysis_id, parties=party_names)


@router.post(
    "/{agreement_id}/versions",
    response_model=Agreement,
    summary="Create Updated Agreement Version",
    description="Synthesizes a new version (e.g. v2.0) from updated follow-up negotiation analysis.",
)
async def create_new_agreement_version(agreement_id: str, request: AgreementCreateRequest) -> Agreement:
    """Creates a new superseded version on existing agreement."""
    agreement = agreement_repo.get_agreement(agreement_id)
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agreement {agreement_id} not found."
        )

    # Generate clauses using updated analysis
    temp_agreement = generator_service.generate_draft(
        analysis_id=request.analysis_id,
        parties=agreement.parties,
    )
    new_clauses = temp_agreement.versions[-1].clauses if temp_agreement.versions else []
    plain_text = generator_service._compile_plain_text(agreement.parties, new_clauses)
    new_hash = HashService.hash_text(plain_text)

    agreement_repo.create_new_version(
        agreement_id=agreement_id,
        clauses=new_clauses,
        content_hash=new_hash,
    )

    return agreement_repo.get_agreement(agreement_id)


@router.get(
    "/{agreement_id}",
    response_model=Agreement,
    summary="Get Agreement Details",
    description="Retrieve agreement version history and status from Supabase.",
)
async def get_agreement(
    agreement_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
) -> Agreement:
    """Retrieve agreement by ID."""
    if not check_agreement_access(agreement_id, current_user, x_review_session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this agreement record.",
        )

    agreement = agreement_repo.get_agreement(agreement_id)
    if not agreement:
        if agreement_id == "sample-agreement-uuid":
            # Auto-seed sample agreement draft so confirmations view is immediately operational
            agreement = generator_service.generate_draft(
                analysis_id="analysis_sample_01",
                parties=["Raj Mehta", "Priya Sharma"],
                agreement_id="sample-agreement-uuid",
            )
            return agreement

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agreement {agreement_id} not found."
        )
    return agreement


@router.get(
    "/{agreement_id}/pdf",
    summary="Export Agreement as Plain-Language Commercial Agreement PDF or Document",
    description="Generates Plain-Language Commercial Agreement Record PDF with SHA-256 fingerprint audit stamp.",
)
async def export_agreement_pdf(
    agreement_id: str,
    format: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
):
    """Export formatted agreement document with cryptographic header."""
    if not check_agreement_access(agreement_id, current_user, x_review_session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this agreement record.",
        )

    agreement = agreement_repo.get_agreement(agreement_id)
    if not agreement:
        if agreement_id == "sample-agreement-uuid":
            agreement = generator_service.generate_draft(
                analysis_id="analysis_sample_01",
                parties=["Raj Mehta", "Priya Sharma"],
                agreement_id="sample-agreement-uuid",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agreement {agreement_id} not found."
            )

    # If explicitly requested as plain text
    if format in ("txt", "text"):
        text_content = generator_service.render_plain_text(agreement)
        headers = {
            "Content-Disposition": f'attachment; filename="agreement-{agreement_id[:8]}.txt"',
            "X-DealShield-Hash": agreement.versions[-1].content_hash or "",
        }
        return Response(content=text_content, media_type="text/plain; charset=utf-8", headers=headers)

    # Default: Generate Plain-Language Commercial Agreement PDF
    from app.services.stamp_pdf_generator import StampPaperPdfService
    from app.db.repository import ConfirmationRepository, AuditRepository

    conf_repo = ConfirmationRepository(client=agreement_repo.client)
    try:
        conf_status = conf_repo.get_confirmation_status(agreement_id)
    except Exception:
        conf_status = None

    pdf_bytes = StampPaperPdfService.generate_pdf(agreement=agreement, confirmation_status=conf_status)
    pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

    # Log immutable audit event with computed PDF SHA-256 fingerprint
    try:
        audit_repo = AuditRepository(client=agreement_repo.client)
        audit_repo.log_event(
            entity_type="agreement",
            entity_id=agreement.id,
            action="agreement_pdf_exported",
            actor_id=current_user["id"] if current_user else None,
            metadata={
                "format": "pdf",
                "pdf_sha256": pdf_sha256,
                "method": "dashboard_export" if current_user else "session_export",
            },
        )
    except Exception:
        pass

    headers = {
        "Content-Disposition": f'attachment; filename="DealShield-Agreement-{agreement_id[:8]}.pdf"',
        "Content-Type": "application/pdf",
        "X-DealShield-Hash": pdf_sha256,
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
