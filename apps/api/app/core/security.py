"""Security and authentication boundaries for DealShield AI API.

IMPORTANT ARCHITECTURAL & LEGAL NOTE:
- A cryptographic hash (SHA-256) establishes data integrity and consistency
  against a trusted reference record; it does NOT independently prove identity,
  authorship, intent, or legal execution under the Indian Evidence Act / IT Act.
- Real two-party identity verification, legal digital signature compliance (e.g. IT Act Sec 3/3A / Aadhaar eSign),
  and tamper-evident hardware timestamps require external licensed Certifying Authorities (CA),
  which are not yet integrated into this early scaffold.
- Service role keys and secrets MUST NEVER be shared with browser clients.
"""

import hashlib
import hmac
from typing import Optional
from app.core.config import settings


def compute_sha256(content: bytes) -> str:
    """Compute standard SHA-256 hexadecimal digest for raw content.
    
    Establishes file integrity against an audit record. Note limitation:
    Proves content hasn't changed since hashed, but doesn't prove who authored it.
    """
    return hashlib.sha256(content).hexdigest()


def hash_ip(ip_address: str, salt: Optional[str] = None) -> str:
    """Anonymize and hash IP address for privacy-conscious audit logs (DPDP Act 2023 compliant).
    
    Reads secret salt from application settings by default.
    """
    effective_salt = salt or settings.IP_HASH_SALT
    return hmac.new(effective_salt.encode("utf-8"), ip_address.encode("utf-8"), hashlib.sha256).hexdigest()


def sanitize_filename(filename: str) -> str:
    """Basic path traversal prevention for uploaded files."""
    cleaned = filename.replace("\\", "/").split("/")[-1]
    return "".join(c for c in cleaned if c.isalnum() or c in "._- ")
