"""Integrity and hashing service for DealShield AI.

=============================================================================
LEGAL & ARCHITECTURAL LIMITATIONS NOTICE:
1. Document hashes (SHA-256) provide mathematical proof of integrity: they verify
   that a document or file has NOT been altered since the hash was recorded.
2. LIMITATION: A hash alone does NOT prove identity, authorship, intention to be
   bound, or legal capacity.
3. LIMITATION: A SHA-256 hash is NOT a substitute for an eSign under the Information
   Technology Act, 2000 (Section 3/3A), nor does it constitute an electronic signature
   issued by a licensed Certifying Authority (CCA).
4. Evidence Vault records must be coupled with authenticated audit trails, timestamps,
   and explicit mutual confirmation logs to be useful as corroborative electronic
   records under Section 65B of the Indian Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam, 2023.
=============================================================================
"""

import hashlib
import json
from typing import Any, Dict, Tuple
from app.schemas.evidence import DocumentHashRecord


class HashService:
    """Service to compute, record, and verify document integrity hashes."""

    @staticmethod
    def hash_bytes(data: bytes) -> str:
        """Compute SHA-256 hex digest for binary data."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def hash_text(text: str) -> str:
        """Compute SHA-256 hex digest for UTF-8 string."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_dict(payload: Dict[str, Any]) -> str:
        """Compute deterministic SHA-256 digest for JSON-serializable dictionaries."""
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def create_document_hash_record(
        cls, document_id: str, document_type: str, content: str
    ) -> DocumentHashRecord:
        """Create a verifiable document hash record for the audit vault."""
        digest = cls.hash_text(content)
        return DocumentHashRecord(
            document_id=document_id,
            document_type=document_type,
            hash_algorithm="sha256",
            hash_value=digest,
        )

    @classmethod
    def verify_integrity(cls, content: str, recorded_hash: str) -> Tuple[bool, str]:
        """Verify whether current content matches the recorded hash.
        
        Returns:
            (is_valid: bool, explanation: str)
        """
        current_hash = cls.hash_text(content)
        if current_hash.lower() == recorded_hash.lower():
            return True, "Content matches the recorded SHA-256 fingerprint exactly. Integrity verified."
        return False, f"Hash mismatch. Expected {recorded_hash}, but computed {current_hash}. Document has been modified."
