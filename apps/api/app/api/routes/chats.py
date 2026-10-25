import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Request
from app.schemas.chat import ChatUploadResponse, Message
from app.services.chat_parser import parse_whatsapp_chat
from app.services.hash_service import HashService
from app.core.config import settings
from app.core.security import sanitize_filename
from app.api.deps import get_current_user, get_optional_current_user, get_client_ip
from app.db.repository import ConversationRepository, EvidenceRepository, AuditRepository

router = APIRouter(prefix="/chats", tags=["Chats"])

# Maximum upload size: 10 MB (10 * 1024 * 1024 bytes) as promised in docs/security.md
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

conv_repo = ConversationRepository()
evidence_repo = EvidenceRepository()
audit_repo = AuditRepository()


@router.post(
    "/upload",
    response_model=ChatUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Parse WhatsApp Chat",
    description="Parses an exported WhatsApp .txt chat transcript, returns normalized messages with stable message IDs, and persists to Supabase.",
)
async def upload_chat(
    request: Request,
    file: Optional[UploadFile] = File(None, description="Exported WhatsApp .txt file"),
) -> ChatUploadResponse:
    """Ingest, parse, and persist WhatsApp conversation."""
    filename = "pasted-chat.txt"
    content = ""

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Upload exceeds maximum allowed size of 10 MB."
                )
        except ValueError:
            pass

    content_type = request.headers.get("content-type", "")

    if file:
        filename = sanitize_filename(file.filename or "uploaded-chat.txt")
        if not filename.endswith(".txt"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only WhatsApp .txt export files are supported."
            )
        raw_bytes = await file.read(MAX_UPLOAD_SIZE_BYTES + 1)
        if len(raw_bytes) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File exceeds maximum allowed size of 10 MB."
            )
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")
    elif "text/plain" in content_type:
        raw_bytes = await request.body()
        if len(raw_bytes) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Payload exceeds maximum allowed size of 10 MB."
            )
        content = raw_bytes.decode("utf-8", errors="replace")
    elif "application/json" in content_type:
        try:
            body = await request.json()
            content = body.get("raw_text", "")
            filename = body.get("filename", "chat-payload.txt")
            if len(content.encode("utf-8")) > MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Payload exceeds maximum allowed size of 10 MB."
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload."
            )
    else:
        raw_bytes = await request.body()
        if len(raw_bytes) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Payload exceeds maximum allowed size of 10 MB."
            )
        if raw_bytes:
            content = raw_bytes.decode("utf-8", errors="replace")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either a .txt file upload or raw text body must be provided."
            )

    if not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat transcript cannot be empty."
        )

    try:
        messages, party_names, date_meta = parse_whatsapp_chat(content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Parsing rejected for evidentiary integrity: {str(e)}"
        )

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid WhatsApp chat messages could be parsed. Check the export format."
        )

    chat_id = str(uuid.uuid4())

    # Extract authenticated user_id if Bearer token present
    user_id = None
    curr_user = get_optional_current_user(request.headers.get("authorization"))
    if curr_user:
        user_id = curr_user.get("id")

    # 1. Persist Conversation in Supabase
    conv_repo.create_conversation(
        conversation_id=chat_id,
        filename=filename,
        party_names=party_names,
        message_count=len(messages),
        user_id=user_id,
    )

    # 2. Persist Messages with unique (conversation_id, message_id)
    conv_repo.save_messages(conversation_id=chat_id, messages=messages)

    # 3. Compute and store original chat transcript SHA-256 hash in Evidence Vault
    raw_hash = HashService.hash_text(content)
    evidence_repo.record_document_hash(
        document_id=chat_id,
        document_type="conversation_raw",
        hash_value=raw_hash,
    )

    # 4. Log Audit Event (Append-Only)
    audit_repo.log_event(
        entity_type="conversation",
        entity_id=chat_id,
        action="chat_uploaded_and_parsed",
        actor_id=user_id,
        metadata={
            "filename": filename,
            "message_count": len(messages),
            "party_count": len(party_names),
            "sha256": raw_hash,
        },
    )

    return ChatUploadResponse(
        chat_id=chat_id,
        filename=filename,
        party_names=party_names,
        message_count=len(messages),
        messages=messages,
        status="parsed",
        date_format_inferred=date_meta.get("date_format"),
        is_date_ambiguous=date_meta.get("is_date_ambiguous", False),
        date_range=date_meta.get("date_range"),
    )


@router.get(
    "/{chat_id}",
    response_model=ChatUploadResponse,
    summary="Get Conversation Messages",
    description="Retrieve stored conversation messages by ID from Supabase.",
)
async def get_chat(
    chat_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> ChatUploadResponse:
    """Retrieve chat by ID from database."""
    conv = conv_repo.get_conversation(chat_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {chat_id} not found."
        )

    # In production, check user ownership
    if settings.ENVIRONMENT != "development":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
        owner_id = str(conv.get("user_id", ""))
        if owner_id != str(current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this conversation.")

    raw_msgs = conv_repo.get_messages(chat_id)
    messages = [
        Message(
            message_id=m["message_id"],
            sender=m["sender"],
            content=m["content"],
            timestamp=m["timestamp"],
            sequence_number=m["sequence_number"],
            raw_line=m["raw_line"],
        )
        for m in raw_msgs
    ]

    date_range_str = None
    timestamps = [m.timestamp for m in messages if m.timestamp]
    if timestamps:
        min_ts = min(timestamps)
        max_ts = max(timestamps)
        if min_ts.date() == max_ts.date():
            date_range_str = min_ts.strftime("%d %b %Y")
        else:
            date_range_str = f"{min_ts.strftime('%d %b %Y')} – {max_ts.strftime('%d %b %Y')}"

    return ChatUploadResponse(
        chat_id=conv["id"],
        filename=conv["filename"],
        party_names=conv.get("party_names", []),
        message_count=len(messages),
        messages=messages,
        status="retrieved",
        date_format_inferred=None,
        is_date_ambiguous=False,
        date_range=date_range_str,
    )


@router.get(
    "",
    summary="List Ingested Conversations",
    description="Retrieve all stored conversations for the current workspace/user.",
)
async def list_chats(
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    """Returns list of conversations."""
    if not current_user:
        if settings.ENVIRONMENT != "development":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
        return conv_repo.list_conversations(user_id="00000000-0000-0000-0000-000000000001")
    return conv_repo.list_conversations(user_id=current_user["id"])


class ClaimChatsRequest(BaseModel):
    conversation_ids: List[str]


@router.post(
    "/claim",
    summary="Claim Unauthenticated Conversations",
    description="Reassigns chats uploaded prior to logging in to the authenticated user account.",
)
async def claim_chats(
    payload: ClaimChatsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Claims conversations uploaded before authentication."""
    count = conv_repo.claim_conversations(
        conversation_ids=payload.conversation_ids,
        target_user_id=current_user["id"],
    )
    return {"claimed_count": count}


@router.delete(
    "/{chat_id}",
    summary="Delete Conversation and Messages",
    description="Permanently erases conversation and all associated message transcripts from the database (DPDP Act 2023 Right to Erasure).",
)
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Deletes conversation and its messages."""
    conv = conv_repo.get_conversation(chat_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {chat_id} not found."
        )

    owner_id = str(conv.get("user_id", ""))
    DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
    if owner_id != str(current_user["id"]):
        if not (settings.ENVIRONMENT == "development" and owner_id == DEMO_USER_ID):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this conversation.",
            )

    conv_repo.delete_conversation(chat_id)

    # Log immutable audit event for DPDP erasure verification
    audit_repo.log_event(
        entity_type="conversation",
        entity_id=chat_id,
        action="conversation_erased_by_user",
        actor_id=current_user["id"],
        metadata={
            "reason": "user_requested_erasure_dpdp",
            "filename": conv.get("filename"),
        },
    )

    return {
        "status": "deleted",
        "chat_id": chat_id,
        "message": "Conversation and all associated message transcripts have been permanently deleted.",
    }


@router.delete(
    "",
    summary="Delete All Conversation History",
    description="Permanently erases all stored conversation transcripts and messages for privacy compliance.",
)
async def delete_all_chats(
    current_user: dict = Depends(get_current_user),
):
    """Deletes all conversations and messages belonging to the current user."""
    count = conv_repo.delete_all_conversations(user_id=current_user["id"])

    audit_repo.log_event(
        entity_type="workspace",
        entity_id=current_user["id"],
        action="all_conversations_erased_by_user",
        actor_id=current_user["id"],
        metadata={"erased_count": count},
    )

    return {
        "status": "deleted",
        "erased_count": count,
        "message": f"Successfully deleted {count} conversations and all associated message history.",
    }

