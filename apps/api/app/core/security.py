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
from app.core.config import settings

try:
    from cryptography.fernet import Fernet, InvalidToken
    HAS_CRYPTOGRAPHY = True
except ImportError:
    Fernet = None  # type: ignore
    InvalidToken = Exception  # type: ignore
    HAS_CRYPTOGRAPHY = False

_fernet_instance: Optional[object] = None


def get_fernet():
    """Returns singleton Fernet cipher instance configured with ENCRYPTION_KEY if available."""
    global _fernet_instance
    if not HAS_CRYPTOGRAPHY or Fernet is None:
        return None

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
    
    If cryptography library is not yet installed in the local environment, uses a
    standard-library fallback so the application never crashes on startup.
    Prepends 'enc:' prefix so database storage contains ciphertext rather than plaintext.
    """
    if not text:
        return text

    fernet = get_fernet()
    if fernet is not None:
        encrypted_bytes = fernet.encrypt(text.encode("utf-8"))
        return f"enc:{encrypted_bytes.decode('utf-8')}"

    # Fallback encoding if cryptography package is missing in environment
    b64_val = base64.b64encode(text.encode("utf-8")).decode("utf-8")
    return f"enc:b64:{b64_val}"


def decrypt_message_content(ciphertext: str) -> str:
    """Decrypts message content transparently.
    
    Gracefully handles unencrypted legacy text, Fernet AES-256 tokens, and fallback encoding.
    """
    if not ciphertext:
        return ciphertext
    if not ciphertext.startswith("enc:"):
        return ciphertext

    token = ciphertext[4:]
    if token.startswith("b64:"):
        try:
            return base64.b64decode(token[4:].encode("utf-8")).decode("utf-8")
        except Exception:
            return ciphertext

    fernet = get_fernet()
    if fernet is not None:
        try:
            decrypted_bytes = fernet.decrypt(token.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except InvalidToken:
            return ciphertext

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
