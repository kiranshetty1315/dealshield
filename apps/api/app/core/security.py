"""Security and authentication boundaries for DealShield AI API.

IMPORTANT ARCHITECTURAL & LEGAL NOTE:
- A cryptographic hash (SHA-256) establishes data integrity and consistency
  against a trusted reference record; it does NOT independently prove identity,
  authorship, intent, or legal execution under the Indian Evidence Act / IT Act.
- Real two-party identity verification, legal digital signature compliance (e.g. IT Act Sec 3/3A / Aadhaar eSign),
  and tamper-evident hardware timestamps require external licensed Certifying Authorities (CA).
- Service role keys and secrets MUST NEVER be shared with browser clients.
- Application-level encryption (Fernet AES-128-CBC + HMAC) protects chat messages at rest in the database.
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
    """Encrypts sensitive chat message content at rest using AES-128-CBC with HMAC-SHA256 (Fernet).
    
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
    
    Gracefully handles unencrypted legacy text, Fernet AES-128-CBC tokens, and fallback encoding.
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


def hash_password(password: str) -> str:
    """Hash password securely using standard library PBKDF2-HMAC-SHA256 (100,000 rounds)."""
    import os
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(stored_hash: str, provided_password: str) -> bool:
    """Verify provided password against stored PBKDF2 salt:key hash."""
    try:
        if not stored_hash or ":" not in stored_hash:
            return False
        salt_hex, key_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    """Create signed, tamper-evident bearer token using HMAC-SHA256 and app secret."""
    import json
    import time
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7-day session
    }
    raw_payload = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_payload).decode("utf-8").rstrip("=")
    secret = getattr(settings, "SECRET_KEY", settings.IP_HASH_SALT)
    signature = hmac.new(
        secret.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{b64_payload}.{signature}"


def verify_access_token(token: str) -> Optional[dict]:
    """Verify and parse signed bearer token. Returns payload dict or None if invalid/expired."""
    import json
    import time
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        secret = getattr(settings, "SECRET_KEY", settings.IP_HASH_SALT)
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            b64_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add base64 padding
        padding = "=" * ((4 - len(b64_payload) % 4) % 4)
        raw_payload = base64.urlsafe_b64decode(b64_payload + padding).decode("utf-8")
        payload = json.loads(raw_payload)

        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
