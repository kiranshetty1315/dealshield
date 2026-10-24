import uuid
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from app.schemas.chat import ChatUploadResponse, Message
from app.services.chat_parser import parse_whatsapp_chat
from app.services.hash_service import HashService
from app.core.security import sanitize_filename
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

    # 1. Persist Conversation in Supabase
    conv_repo.create_conversation(
        conversation_id=chat_id,
        filename=filename,
        party_names=party_names,
        message_count=len(messages),
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
