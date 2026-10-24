from fastapi import APIRouter, HTTPException, status, Response
from app.schemas.agreement import Agreement, AgreementCreateRequest
from app.services.agreement_generator import AgreementGeneratorService
from app.db.repository import AgreementRepository

router = APIRouter(prefix="/agreements", tags=["Agreements"])

agreement_repo = AgreementRepository()
generator_service = AgreementGeneratorService()


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
    )
    return agreement


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
    summary="Export Agreement as Document",
    description="Generates document export with SHA-256 fingerprint audit stamp.",
)
async def export_agreement_pdf(agreement_id: str):
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

    text_content = generator_service.render_plain_text(agreement)
    headers = {
        "Content-Disposition": f'attachment; filename="agreement-{agreement_id[:8]}.txt"',
        "X-DealShield-Hash": agreement.versions[-1].content_hash or "",
    }
    return Response(content=text_content, media_type="text/plain; charset=utf-8", headers=headers)
