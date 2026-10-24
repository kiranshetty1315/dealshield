"""WhatsApp chat parser service for DealShield AI.

Parses exported WhatsApp .txt chat transcripts into normalized messages
with stable message IDs that downstream extraction and conflict detection
can cite reliably.
"""

import re
import hashlib
from datetime import datetime, timezone
from typing import List, Tuple
from app.schemas.chat import Message


# Regex pattern supporting common WhatsApp export formats:
# Format A: "12/03/24, 10:15 - Raj Mehta: Message text"
# Format B: "12/03/2024, 10:15:20 - Raj Mehta: Message text"
# Format C: "[12/03/24, 10:15:20] Raj Mehta: Message text"
WHATSAPP_LINE_REGEX = re.compile(
    r"^\[?(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*[-–]?\s*([^:]+):\s*(.*)$"
)


def _parse_timestamp(date_str: str, time_str: str) -> datetime:
    """Best-effort timestamp parser for various chat export date formats."""
    # Normalize clean strings
    date_clean = date_str.strip()
    time_clean = time_str.strip()
    full_str = f"{date_clean} {time_clean}"

    formats = [
        "%d/%m/%y %H:%M",
        "%d/%m/%Y %H:%M",
        "%d/%m/%y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%y %I:%M %p",
        "%d/%m/%Y %I:%M %p",
        "%m/%d/%y %H:%M",
        "%m/%d/%Y %H:%M",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(full_str, fmt)
        except ValueError:
            continue

    # Fallback to current time if unparseable
    return datetime.now(timezone.utc)


def _generate_stable_message_id(sequence_number: int, sender: str, timestamp_str: str, content: str) -> str:
    """Generate a deterministic, human-readable stable message ID.
    
    Format: msg_{sender_slug}_{seq}_{hash}
    Allows direct citation in extracted terms and conflict resolution.
    """
    sender_slug = re.sub(r"[^a-zA-Z0-9]", "", sender.lower())[:8] or "user"
    digest = hashlib.sha256(f"{sequence_number}:{sender}:{content}".encode("utf-8")).hexdigest()[:6]
    return f"msg_{sender_slug}_{sequence_number:03d}_{digest}"


def parse_whatsapp_chat(raw_text: str) -> Tuple[List[Message], List[str]]:
    """Parse raw WhatsApp export text into a structured list of messages.
    
    Handles multi-line messages, extracts unique sender names, and assigns
    deterministic message IDs.
    
    Returns:
        (messages, unique_senders)
    """
    lines = raw_text.splitlines()
    messages: List[Message] = []
    senders_set: set[str] = set()

    current_sender: str = ""
    current_timestamp: datetime = datetime.now(timezone.utc)
    current_content_lines: List[str] = []
    current_raw_lines: List[str] = []
    sequence = 0

    def commit_current():
        nonlocal sequence
        if current_sender and current_content_lines:
            content = "\n".join(current_content_lines).strip()
            raw_line = "\n".join(current_raw_lines)
            msg_id = _generate_stable_message_id(
                sequence, current_sender, current_timestamp.isoformat(), content
            )
            messages.append(
                Message(
                    message_id=msg_id,
                    sender=current_sender,
                    content=content,
                    timestamp=current_timestamp,
                    sequence_number=sequence,
                    raw_line=raw_line,
                )
            )
            sequence += 1

    for line in lines:
        match = WHATSAPP_LINE_REGEX.match(line)
        if match:
            # Commit previously accumulated message
            commit_current()

            date_part, time_part, sender_part, content_part = match.groups()
            sender_clean = sender_part.strip()
            # Filter out system messages like "Messages and calls are end-to-end encrypted"
            if "end-to-end encrypted" in line.lower() or "created group" in line.lower():
                current_sender = ""
                current_content_lines = []
                current_raw_lines = []
                continue

            current_sender = sender_clean
            senders_set.add(sender_clean)
            current_timestamp = _parse_timestamp(date_part, time_part)
            current_content_lines = [content_part]
            current_raw_lines = [line]
        else:
            # Continuation line of previous message
            if current_sender:
                current_content_lines.append(line)
                current_raw_lines.append(line)

    commit_current()
    return messages, sorted(list(senders_set))
