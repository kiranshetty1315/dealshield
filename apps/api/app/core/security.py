"""Security and authentication boundaries for DealShield AI API.

IMPORTANT ARCHITECTURAL & LEGAL NOTE:
- A cryptographic hash (SHA-256) establishes data integrity and consistency
  against a trusted reference record; it does NOT independently prove identity,
  authorship, intent, or legal execution under the Indian Evidence Act / IT Act.
- Real two-party identity verification, legal digital signature compliance (e.g. IT Act Sec 3/3A / Aadhaar eSign),
  and tamper-evident hardware timestamps require external licensed Certifying Authorities (CA).
- Service role keys and secrets MUST NEVER be shared with browser clients.
- Application-level encryption (Fernet / AES-256) protects chat messages at rest in the database.
"""

import base64
import hashlib
import hmac
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

_fernet_instance: Optional[Fernet] = None


def get_fernet() -> Fernet:
    """Returns singleton Fernet cipher instance configured with ENCRYPTION_KEY."""
    global _fernet_instance
    if _fernet_instance is None:
        key = settings.ENCRYPTION_KEY
        try:
            _fernet_instance = Fernet(key.encode("utf-8") if isinstance(key, str) else key)
        except Exception:
            # Deterministic SHA-256 32-byte key derivation fallback
            raw_32 = hashlib.sha256(key.encode("utf-8")).digest()
            urlsafe_key = base64.urlsafe_b64encode(raw_32)
            _fernet_instance = Fernet(urlsafe_key)
    return _fernet_instance


def encrypt_message_content(text: str) -> str:
    """Encrypts sensitive chat message content at rest using AES-128/256-CBC with HMAC-SHA256 (Fernet).
    
    Prepends 'enc:' prefix so database administrators see ciphertext rather than plaintext.
    """
    if not text:
        return text
    fernet = get_fernet()
    encrypted_bytes = fernet.encrypt(text.encode("utf-8"))
    return f"enc:{encrypted_bytes.decode('utf-8')}"


def decrypt_message_content(ciphertext: str) -> str:
    """Decrypts message content transparently.
    
    Gracefully handles unencrypted legacy text for backwards compatibility.
    """
    if not ciphertext:
        return ciphertext
    if not ciphertext.startswith("enc:"):
        return ciphertext
    token = ciphertext[4:]
    fernet = get_fernet()
    try:
        decrypted_bytes = fernet.decrypt(token.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        return ciphertext


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
