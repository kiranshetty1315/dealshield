from typing import Optional
from fastapi import APIRouter, HTTPException, status, Response
from app.schemas.agreement import Agreement, AgreementCreateRequest
from app.services.agreement_generator import AgreementGeneratorService
from app.services.hash_service import HashService
from app.db.repository import AgreementRepository, AnalysisRepository

router = APIRouter(prefix="/agreements", tags=["Agreements"])

agreement_repo = AgreementRepository()
generator_service = AgreementGeneratorService()
analysis_repo = AnalysisRepository()


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
async def get_agreement(agreement_id: str) -> Agreement:
    """Retrieve agreement by ID."""
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
    summary="Export Agreement as Indian Stamp Paper PDF or Document",
    description="Generates Indian Non-Judicial Stamp Paper PDF with SHA-256 fingerprint audit stamp.",
)
async def export_agreement_pdf(
    agreement_id: str,
    format: Optional[str] = None,
):
    """Export formatted agreement document with cryptographic header."""
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

    # Default: Generate authentic Indian Non-Judicial e-Stamp Paper PDF
    from app.services.stamp_pdf_generator import StampPaperPdfService
    from app.db.repository import ConfirmationRepository

    conf_repo = ConfirmationRepository(client=agreement_repo.client)
    try:
        conf_status = conf_repo.get_confirmation_status(agreement_id)
    except Exception:
        conf_status = None

    pdf_bytes = StampPaperPdfService.generate_pdf(agreement=agreement, confirmation_status=conf_status)

    headers = {
        "Content-Disposition": f'attachment; filename="DealShield-Stamp-Agreement-{agreement_id[:8]}.pdf"',
        "Content-Type": "application/pdf",
        "X-DealShield-Hash": agreement.versions[-1].content_hash or "",
        "X-Stamp-Paper": "Indian-Non-Judicial-Article-5C",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
