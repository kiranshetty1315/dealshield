import uuid
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from app.schemas.chat import ChatUploadResponse, Message
from app.services.chat_parser import parse_whatsapp_chat
from app.core.security import sanitize_filename

router = APIRouter(prefix="/chats", tags=["Chats"])


@router.post(
    "/upload",
    response_model=ChatUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Parse WhatsApp Chat",
    description="Parses an exported WhatsApp .txt chat transcript and returns normalized messages with stable message IDs for fact citation."
)
async def upload_chat(
    request: Request,
    file: Optional[UploadFile] = File(None, description="Exported WhatsApp .txt file"),
) -> ChatUploadResponse:
    """Ingest and parse WhatsApp conversation from file or raw text body."""
    filename = "pasted-chat.txt"
    content = ""

    content_type = request.headers.get("content-type", "")

    if file:
        filename = sanitize_filename(file.filename or "uploaded-chat.txt")
        if not filename.endswith(".txt"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only WhatsApp .txt export files are supported."
            )
        raw_bytes = await file.read()
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")
    elif "text/plain" in content_type:
        raw_bytes = await request.body()
        content = raw_bytes.decode("utf-8", errors="replace")
    elif "application/json" in content_type:
        try:
            body = await request.json()
            content = body.get("raw_text", "")
            filename = body.get("filename", "chat-payload.txt")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload."
            )
    else:
        # Check if multipart form with no file but raw body
        raw_bytes = await request.body()
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

    messages, party_names = parse_whatsapp_chat(content)

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid WhatsApp chat messages could be parsed. Check the export format."
        )

    chat_id = f"chat_{uuid.uuid4().hex[:12]}"

    return ChatUploadResponse(
        chat_id=chat_id,
        filename=filename,
        party_names=party_names,
        message_count=len(messages),
        messages=messages,
        status="parsed"
    )


@router.get(
    "/{chat_id}",
    summary="Get Conversation Messages",
    description="Retrieve stored conversation messages by ID."
)
async def get_chat(chat_id: str):
    """Retrieve chat by ID - database retrieval owned by Team D."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Database retrieval is pending Team D (Database & Security) implementation."
    )
