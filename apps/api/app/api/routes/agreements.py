from datetime import datetime, timezone
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, Response
import re
from app.schemas.agreement import Agreement, AgreementCreateRequest, AgreementUpdatePartiesRequest, Clause
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
    analysis = analysis_repo.get_analysis(request.analysis_id)
    if analysis and not analysis.is_commercial_deal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No commercial negotiation detected in this conversation",
        )

    agreement = generator_service.generate_draft(
        analysis_id=request.analysis_id,
        parties=request.parties,
        terms=request.terms,
    )
    return agreement


@router.get(
    "/chat/{chat_id}",
    response_model=Agreement,
    summary="Get or Generate Agreement by Chat ID",
    description="Retrieves existing agreement draft for a conversation or automatically synthesizes one from analysis.",
)
async def get_agreement_by_chat(
    chat_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> Agreement:
    """Retrieve agreement for conversation or generate on-the-fly."""
    # 1. Look up analysis for this chat
    analysis = analysis_repo.get_analysis_by_chat_id(chat_id)
    if not analysis:
        from app.api.routes.analysis import analyze_chat
        from app.schemas.analysis import AnalysisRequest
        analysis = await analyze_chat(AnalysisRequest(chat_id=chat_id))

    if analysis and not analysis.is_commercial_deal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No commercial negotiation detected in this conversation",
        )

    # 2. Check if an agreement already exists for this analysis_id
    res = agreement_repo.client.table("agreements").select("*").eq("analysis_id", analysis.analysis_id).execute()
    data = res.data if isinstance(res.data, list) else ([res.data] if res.data else [])
    if data and data[0]:
        return agreement_repo.get_agreement(data[0]["id"])

    # 3. Otherwise synthesize draft agreement with real user name instead of 'You'
    party_names = [p.name for p in analysis.parties] if analysis.parties else None
    if current_user and current_user.get("full_name") and party_names:
        user_name = current_user["full_name"].strip()
        if current_user.get("organization"):
            user_name = f"{user_name} ({current_user['organization'].strip()})"
        if party_names[0].strip().lower() in ("you", "user", "me"):
            party_names[0] = user_name
        elif len(party_names) > 1 and party_names[1].strip().lower() in ("you", "user", "me"):
            party_names[1] = user_name

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



@router.put(
    "/{agreement_id}/parties",
    response_model=Agreement,
    summary="Update Agreement Contracting Parties",
    description="Updates contracting party legal identities (e.g. from signup and Aadhaar), updating clauses, hashes, and confirmation records.",
)
async def update_agreement_parties(
    agreement_id: str,
    request: AgreementUpdatePartiesRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
) -> Agreement:
    """Updates party legal names on an existing agreement, updating clauses and hashes."""
    if not check_agreement_access(agreement_id, current_user, x_review_session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this agreement record.",
        )

    agreement = agreement_repo.get_agreement(agreement_id)
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agreement {agreement_id} not found."
        )

    old_p1 = agreement.parties[0] if len(agreement.parties) > 0 else "You"
    old_p2 = agreement.parties[1] if len(agreement.parties) > 1 else "Counterparty"

    # Construct clean, formal party designations
    initiator_clean = request.initiator_name.strip()
    initiator_co = request.initiator_company.strip() if request.initiator_company else ""
    new_p1 = f"{initiator_clean} ({initiator_co})" if initiator_co else initiator_clean

    client_clean = request.client_legal_name.strip()
    client_co = request.client_company.strip() if request.client_company else ""
    new_p2 = f"{client_clean} ({client_co})" if client_co else client_clean

    updated_parties = [new_p1, new_p2]

    # Get latest version
    latest_version = agreement.versions[-1] if agreement.versions else None
    if not latest_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agreement has no version history to update.",
        )

    # Cleanly replace party names in clauses
    updated_clauses = []
    for c in latest_version.clauses:
        body = c.body
        # Replace occurrences of old party names
        if old_p1 and old_p1 != new_p1:
            body = body.replace(old_p1, new_p1)
        if old_p2 and old_p2 != new_p2:
            body = body.replace(old_p2, new_p2)

        # Replace standalone 'You' / 'you' with initiator name
        body = re.sub(r'\bYou\b', new_p1, body)
        body = re.sub(r'\byou\b', new_p1, body)

        updated_clauses.append(
            Clause(
                clause_id=c.clause_id,
                title=c.title,
                body=body,
                source_term_ids=c.source_term_ids,
                statutory_reference=c.statutory_reference,
            )
        )

    # Re-compile plain text and rehash
    plain_text = generator_service._compile_plain_text(updated_parties, updated_clauses)
    new_hash = HashService.hash_text(plain_text)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Update agreement in database
    agreement_repo.client.table("agreements").update({
        "parties": updated_parties,
        "updated_at": now_iso,
    }).eq("id", agreement_id).execute()

    # Update latest version clauses & content_hash
    if latest_version.id:
        agreement_repo.client.table("agreement_versions").update({
            "clauses": [c.model_dump() for c in updated_clauses],
            "content_hash": new_hash,
        }).eq("id", latest_version.id).execute()
    else:
        agreement_repo.client.table("agreement_versions").update({
            "clauses": [c.model_dump() for c in updated_clauses],
            "content_hash": new_hash,
        }).eq("agreement_id", agreement_id).eq("version_number", agreement.current_version).execute()

    # Update confirmations table party_name entries so tokens match new party names
    try:
        conf_res = agreement_repo.client.table("confirmations").select("id, party_name").eq("agreement_id", agreement_id).execute()
        conf_rows = conf_res.data if isinstance(conf_res.data, list) else ([conf_res.data] if conf_res.data else [])
        if conf_rows:
            for idx, crow in enumerate(conf_rows):
                cp_name = crow.get("party_name", "")
                target_new_name = None
                if cp_name == old_p1 or cp_name.lower() in ("you", "user", "me") or idx == 0:
                    target_new_name = new_p1
                elif cp_name == old_p2 or idx == 1:
                    target_new_name = new_p2
                if target_new_name and target_new_name != cp_name:
                    agreement_repo.client.table("confirmations").update({
                        "party_name": target_new_name,
                    }).eq("id", crow["id"]).execute()
    except Exception as e:
        print(f"Warning: could not update confirmations table party names: {e}")

    # Audit event
    try:
        from app.db.repository import AuditRepository
        audit_repo = AuditRepository(client=agreement_repo.client)
        audit_repo.log_event(
            entity_type="agreement",
            entity_id=agreement.id,
            action="agreement_parties_updated",
            actor_id=current_user["id"] if current_user else None,
            metadata={
                "old_parties": agreement.parties,
                "new_parties": updated_parties,
                "content_hash": new_hash,
            },
        )
    except Exception:
        pass

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
