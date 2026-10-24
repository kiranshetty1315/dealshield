import uuid
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from app.schemas.chat import ChatUploadResponse, Message
from app.services.chat_parser import parse_whatsapp_chat
from app.services.hash_service import HashService
from app.core.security import sanitize_filename, verify_access_token
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
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = verify_access_token(token)
        if payload:
            user_id = payload.get("sub")

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
        is_date_ambiguous=date_meta.get("is_date_ambiguous", False)
    )


@router.get(
    "/{chat_id}",
    response_model=ChatUploadResponse,
    summary="Get Conversation Messages",
    description="Retrieve stored conversation messages by ID from Supabase.",
)
async def get_chat(chat_id: str) -> ChatUploadResponse:
    """Retrieve chat by ID from database."""
    conv = conv_repo.get_conversation(chat_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {chat_id} not found."
        )

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

    return ChatUploadResponse(
        chat_id=conv["id"],
        filename=conv["filename"],
        party_names=conv.get("party_names", []),
        message_count=len(messages),
        messages=messages,
        status="retrieved",
        date_format_inferred=None,
        is_date_ambiguous=False,
    )


@router.get(
    "",
    summary="List Ingested Conversations",
    description="Retrieve all stored conversations for the current workspace/user.",
)
async def list_chats():
    """Returns list of conversations."""
    return conv_repo.list_conversations()


@router.delete(
    "/{chat_id}",
    summary="Delete Conversation and Messages",
    description="Permanently erases conversation and all associated message transcripts from the database (DPDP Act 2023 Right to Erasure).",
)
async def delete_chat(chat_id: str):
    """Deletes conversation and its messages."""
    conv = conv_repo.get_conversation(chat_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {chat_id} not found."
        )

    conv_repo.delete_conversation(chat_id)

    # Log immutable audit event for DPDP erasure verification
    audit_repo.log_event(
        entity_type="conversation",
        entity_id=chat_id,
        action="conversation_erased_by_user",
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
async def delete_all_chats():
    """Deletes all conversations and messages."""
    count = conv_repo.delete_all_conversations()

    audit_repo.log_event(
        entity_type="workspace",
        entity_id="00000000-0000-0000-0000-000000000001",
        action="all_conversations_erased_by_user",
        metadata={"erased_count": count},
    )

    return {
        "status": "deleted",
        "erased_count": count,
        "message": f"Successfully deleted {count} conversations and all associated message history.",
    }

