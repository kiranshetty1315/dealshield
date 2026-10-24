"""WhatsApp chat parser service for DealShield AI.

Parses exported WhatsApp .txt chat transcripts into normalized messages
with stable message IDs that downstream extraction and conflict detection
can cite reliably.

EVIDENTIARY INTEGRITY RULES:
1. Message IDs follow a single canonical format: msg_<sender_slug>_<seq:03d>
   (e.g. msg_raj_003, msg_priya_008).
2. Unparseable timestamps MUST NOT silently default to datetime.now(); they raise ValueError.
3. Date format ambiguity (DD/MM vs MM/DD) is resolved by scanning the entire conversation
   for numbers > 12; if all dates are <= 12, it defaults to DD/MM (Indian standard) and flags ambiguity.
"""

import re
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional
from app.schemas.chat import Message


# Regex pattern supporting common WhatsApp export formats:
# Format A: "12/03/24, 10:15 - Raj Mehta: Message text"
# Format B: "12/03/2024, 10:15:20 - Raj Mehta: Message text"
# Format C: "[12/03/24, 10:15:20] Raj Mehta: Message text"
WHATSAPP_LINE_REGEX = re.compile(
    r"^\[?(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*[-–]?\s*([^:]+):\s*(.*)$"
)


def _detect_chat_date_convention(raw_lines: List[str]) -> Tuple[bool, bool, str]:
    """Scan all lines in chat to determine if format is DD/MM or MM/DD.
    
    Returns:
        (day_first: bool, is_ambiguous: bool, description: str)
    """
    found_day_first = False
    found_month_first = False

    for line in raw_lines:
        match = WHATSAPP_LINE_REGEX.match(line)
        if match:
            date_str = match.group(1).strip()
            parts = re.split(r"[/.-]", date_str)
            if len(parts) >= 2:
                try:
                    p1, p2 = int(parts[0]), int(parts[1])
                    if p1 > 12 >= p2:
                        found_day_first = True
                    elif p2 > 12 >= p1:
                        found_month_first = True
                except ValueError:
                    continue

    if found_day_first and not found_month_first:
        return True, False, "DD/MM/YYYY (unambiguously verified by day > 12)"
    elif found_month_first and not found_day_first:
        return False, False, "MM/DD/YYYY (unambiguously verified by month-first > 12)"
    else:
        # Ambiguous (all numbers <= 12) -> Default to day-first (Indian commercial standard)
        return True, True, "DD/MM/YYYY (ambiguous across transcript; defaulted to Indian DD/MM standard)"


def _parse_timestamp(date_str: str, time_str: str, day_first: bool = True) -> datetime:
    """Parse timestamp rigorously. Fails loudly on malformed dates."""
    date_clean = date_str.strip()
    time_clean = time_str.strip()
    full_str = f"{date_clean} {time_clean}"

    if day_first:
        formats = [
            "%d/%m/%y %H:%M",
            "%d/%m/%Y %H:%M",
            "%d/%m/%y %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%y %I:%M %p",
            "%d/%m/%Y %I:%M %p",
            "%d/%m/%y %I:%M%p",
            "%d/%m/%Y %I:%M%p",
            "%m/%d/%y %H:%M",
            "%m/%d/%Y %H:%M",
        ]
    else:
        formats = [
            "%m/%d/%y %H:%M",
            "%m/%d/%Y %H:%M",
            "%m/%d/%y %H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
            "%m/%d/%y %I:%M %p",
            "%m/%d/%Y %I:%M %p",
            "%d/%m/%y %H:%M",
            "%d/%m/%Y %H:%M",
        ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(full_str, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    # FAIL LOUDLY: For evidentiary records, timestamps must not be fabricated
    raise ValueError(
        f"Evidentiary Integrity Error: Unable to verify timestamp format for '{full_str}'. "
        "Chat transcript header is malformed or unverified."
    )


def _generate_stable_message_id(sequence_number: int, sender: str) -> str:
    """Generate standardized, human-readable message ID for verbatim legal citation.
    
    Format: msg_<sender_slug>_<seq:03d> (e.g. msg_raj_001, msg_priya_002)
    Enables exact 1:1 match across analysis UI, agreements, and evidence records.
    """
    first_token = sender.strip().split()[0].lower() if sender.strip() else "user"
    sender_slug = re.sub(r"[^a-z0-9]", "", first_token)[:12] or "user"
    return f"msg_{sender_slug}_{sequence_number:03d}"


def parse_whatsapp_chat(
    raw_text: str, day_first_override: Optional[bool] = None
) -> Tuple[List[Message], List[str], Dict[str, Any]]:
    """Parse raw WhatsApp export text into a structured list of messages.
    
    Returns:
        (messages, unique_senders, metadata)
    """
    lines = raw_text.splitlines()
    if not lines:
        return [], [], {"date_format": "unknown", "is_ambiguous": False}

    # Disambiguate date format across entire conversation
    detected_day_first, is_ambiguous, format_desc = _detect_chat_date_convention(lines)
    day_first = day_first_override if day_first_override is not None else detected_day_first

    messages: List[Message] = []
    senders_set: set[str] = set()

    current_sender: str = ""
    current_timestamp: Optional[datetime] = None
    current_content_lines: List[str] = []
    current_raw_lines: List[str] = []
    sequence = 1  # 1-based sequence to match citations (msg_raj_001, msg_raj_003)

    def commit_current():
        nonlocal sequence
        if current_sender and current_content_lines and current_timestamp:
            content = "\n".join(current_content_lines).strip()
            raw_line = "\n".join(current_raw_lines)
            msg_id = _generate_stable_message_id(sequence, current_sender)
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

    for line_idx, line in enumerate(lines, start=1):
        match = WHATSAPP_LINE_REGEX.match(line)
        if match:
            commit_current()

            date_part, time_part, sender_part, content_part = match.groups()
            sender_clean = sender_part.strip()

            # Ignore system notifications
            if "end-to-end encrypted" in line.lower() or "created group" in line.lower():
                current_sender = ""
                current_timestamp = None
                current_content_lines = []
                current_raw_lines = []
                continue

            current_sender = sender_clean
            senders_set.add(sender_clean)
            try:
                current_timestamp = _parse_timestamp(date_part, time_part, day_first=day_first)
            except ValueError as e:
                raise ValueError(f"Line {line_idx}: {str(e)}")

            current_content_lines = [content_part]
            current_raw_lines = [line]
        else:
            if current_sender:
                current_content_lines.append(line)
                current_raw_lines.append(line)

    commit_current()

    metadata = {
        "date_format": format_desc,
        "is_date_ambiguous": is_ambiguous,
        "day_first_applied": day_first,
    }

    return messages, sorted(list(senders_set)), metadata
