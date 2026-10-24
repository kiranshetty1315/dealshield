import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.analysis import AnalysisRequest, AgreementAnalysis
from app.schemas.chat import Message
from app.db.repository import AnalysisRepository, ConversationRepository, AuditRepository
from app.services.ai_extractor import AIExtractorService
from app.services.chat_parser import parse_whatsapp_chat

router = APIRouter(prefix="/analysis", tags=["Analysis"])

analysis_repo = AnalysisRepository()
conv_repo = ConversationRepository()
audit_repo = AuditRepository()
extractor_service = AIExtractorService()


@router.post(
    "",
    response_model=AgreementAnalysis,
    status_code=status.HTTP_200_OK,
    summary="Trigger AI Agreement Analysis",
    description="Extracts terms, detects Section 7 contradictions, and identifies missing clauses via Gemini 3.8 Flash structured outputs.",
)
async def analyze_chat(request: AnalysisRequest) -> AgreementAnalysis:
    """Trigger AI agreement extraction and legal analysis.
    
    1. Looks up conversation and messages from Supabase repository.
    2. Runs AI extraction with Section 7 Indian Contract Act conflict detection.
    3. Persists analysis findings to Supabase.
    4. Records immutable audit event.
    """
    messages_raw = conv_repo.get_messages(request.chat_id)

    if not messages_raw:
        # Check if conversation metadata exists
        conv = conv_repo.get_conversation(request.chat_id)
        if not conv:
            # Check for sample fixtures fallback if requested directly by sample chat ID
            sample_file = None
            if "sample_negotiation_01" in request.chat_id or "sample_01" in request.chat_id:
                sample_file = "sample-data/whatsapp/sample-negotiation-01.txt"
            elif "sample_negotiation_02" in request.chat_id or "sample_02" in request.chat_id:
                sample_file = "sample-data/whatsapp/sample-negotiation-02.txt"

            if sample_file and os.path.exists(sample_file):
                with open(sample_file, "r", encoding="utf-8") as f:
                    raw_text = f.read()
                parsed_msgs, senders, _ = parse_whatsapp_chat(raw_text)
                conv_repo.create_conversation(
                    conversation_id=request.chat_id,
                    filename=os.path.basename(sample_file),
                    party_names=senders,
                    message_count=len(parsed_msgs),
                )
                conv_repo.save_messages(request.chat_id, parsed_msgs)
                messages = parsed_msgs
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {request.chat_id} not found. Please upload the chat transcript first via /api/v1/chats/upload."
                )
        else:
            messages = []
    else:
        messages = []
        for m in messages_raw:
            ts = m.get("timestamp")
            if isinstance(ts, str):
                try:
                    ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    ts_dt = datetime.now(timezone.utc)
            elif isinstance(ts, datetime):
                ts_dt = ts
            else:
                ts_dt = datetime.now(timezone.utc)

            messages.append(
                Message(
                    message_id=m["message_id"],
                    sender=m["sender"],
                    content=m["content"],
                    timestamp=ts_dt,
                    sequence_number=m.get("sequence_number", 0),
                    raw_line=m.get("raw_line", ""),
                )
            )

    # Execute extraction & legal intelligence analysis
    analysis = await extractor_service.analyze_chat(
        chat_id=request.chat_id,
        messages=messages,
        focus_areas=request.focus_areas,
    )

    # Ensure valid UUIDs for PostgreSQL schema constraints
    from app.db.repository import ensure_uuid
    analysis.analysis_id = ensure_uuid(analysis.analysis_id)
    analysis.chat_id = ensure_uuid(analysis.chat_id)

    # Persist findings to database
    analysis_repo.save_analysis(analysis)

    # Log immutable audit trail
    audit_repo.log_event(
        entity_type="analysis",
        entity_id=analysis.analysis_id,
        action="analysis_completed",
        metadata={
            "chat_id": str(analysis.chat_id),
            "terms_extracted": len(analysis.extracted_terms),
            "conflicts_detected": len(analysis.conflicts),
            "missing_terms_flagged": len(analysis.missing_terms),
            "confidence_score": analysis.confidence_score,
            "requires_human_review": analysis.requires_human_review,
        },
    )

    return analysis


@router.get(
    "/chat/{chat_id}",
    response_model=AgreementAnalysis,
    summary="Get or Generate Analysis by Chat ID",
    description="Retrieve existing analysis for a conversation or automatically trigger analysis from stored messages.",
)
async def get_analysis_by_chat(chat_id: str) -> AgreementAnalysis:
    """Retrieve analysis for conversation or generate on-the-fly."""
    existing = analysis_repo.get_analysis_by_chat_id(chat_id)
    if existing:
        return existing
    return await analyze_chat(AnalysisRequest(chat_id=chat_id))


@router.get(
    "/{analysis_id}",
    response_model=AgreementAnalysis,
    summary="Get Analysis Result",
    description="Retrieve stored analysis findings from Supabase.",
)
async def get_analysis(analysis_id: str) -> AgreementAnalysis:
    """Retrieve existing analysis record from database."""
    result = analysis_repo.get_analysis(analysis_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis {analysis_id} not found."
        )
    return result
