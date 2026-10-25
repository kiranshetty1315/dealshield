"""Supabase Repository Layer for DealShield AI.

Implements database persistence operations for conversations, messages,
agreements, confirmations, audit logs, and document hashes according to the
PostgreSQL schema in infra/supabase/migrations/001_initial_schema.sql.
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.db.client import get_supabase_client
from app.schemas.chat import Message
from app.schemas.analysis import AgreementAnalysis
from app.schemas.agreement import Agreement, AgreementVersion, Clause, AgreementStatus
from app.schemas.confirmation import ConfirmationStatus, PartyConfirmationRecord
from app.schemas.evidence import DocumentHashRecord, AuditEventRecord
from app.services.hash_service import HashService
from app.core.security import (
    encrypt_message_content,
    decrypt_message_content,
    hash_password,
    verify_password,
)


def is_valid_uuid(val: Any) -> bool:
    """Check if value is a valid UUID string."""
    if not val:
        return False
    try:
        uuid.UUID(str(val).strip())
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def ensure_uuid(val: Any) -> str:
    """Ensure a string or object is a valid RFC 4122 UUID string.
    
    If already a valid UUID, returns canonical string representation.
    If not a valid UUID (e.g. LLM-generated slugs like 'anlys_0c6f9df5_20260901'
    or fixture names like 'analysis_expected_01'), deterministically derives
    a valid UUIDv5 using NAMESPACE_DNS so database constraints are satisfied
    and repeated queries for the same key resolve consistently.
    """
    if not val:
        return str(uuid.uuid4())
    s = str(val).strip()
    try:
        return str(uuid.UUID(s))
    except (ValueError, AttributeError, TypeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, s))


class ConversationRepository:
    """Manages conversations and message citations persistence."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def create_conversation(
        self,
        conversation_id: str,
        filename: str,
        party_names: List[str],
        message_count: int,
        user_id: Optional[str] = None,
        raw_content_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        user_uuid = user_id or "00000000-0000-0000-0000-000000000001"
        row = {
            "id": conversation_id,
            "user_id": user_uuid,
            "filename": filename,
            "party_names": party_names,
            "message_count": message_count,
            "raw_content_path": raw_content_path,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("conversations").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) else res.data

    def save_messages(self, conversation_id: str, messages: List[Message]) -> List[Dict[str, Any]]:
        rows = []
        for msg in messages:
            ts_iso = (
                msg.timestamp.isoformat()
                if isinstance(msg.timestamp, datetime)
                else str(msg.timestamp)
            )
            # Application-level encryption at rest (Fernet AES-128-CBC + HMAC)
            encrypted_content = encrypt_message_content(msg.content)
            encrypted_raw_line = encrypt_message_content(msg.raw_line)

            rows.append({
                "conversation_id": conversation_id,
                "message_id": msg.message_id,
                "sender": msg.sender,
                "content": encrypted_content,
                "timestamp": ts_iso,
                "raw_line": encrypted_raw_line,
                "sequence_number": msg.sequence_number,
            })
        if not rows:
            return []
        res = self.client.table("messages").insert(rows).execute()
        return res.data if isinstance(res.data, list) else [res.data]

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("conversations").select("*").eq("id", conversation_id).execute()
        data = res.data
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def list_conversations(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        qb = self.client.table("conversations").select("*")
        if user_id:
            qb = qb.eq("user_id", user_id)
        res = qb.order("uploaded_at", desc=True).execute()
        data = res.data
        return data if isinstance(data, list) else ([data] if data else [])

    def get_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        res = (
            self.client.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("sequence_number", desc=False)
            .execute()
        )
        data = res.data
        rows = data if isinstance(data, list) else ([data] if data else [])
        
        # Transparently decrypt message content and raw line when reading
        decrypted_rows = []
        for row in rows:
            r = dict(row)
            if "content" in r:
                r["content"] = decrypt_message_content(r["content"])
            if "raw_line" in r:
                r["raw_line"] = decrypt_message_content(r["raw_line"])
            decrypted_rows.append(r)
        return decrypted_rows

    def delete_conversation(self, conversation_id: str) -> bool:
        """Permanently deletes conversation and all its parsed messages (Right to Erasure - DPDP Act 2023)."""
        # 1. Delete associated messages
        self.client.table("messages").delete().eq("conversation_id", conversation_id).execute()
        # 2. Delete conversation record
        res = self.client.table("conversations").delete().eq("id", conversation_id).execute()
        return bool(res.data)

    def delete_all_conversations(self, user_id: Optional[str] = None) -> int:
        """Permanently deletes all stored conversations and messages upon user request."""
        if user_id:
            convs = self.list_conversations(user_id=user_id)
            cids = [c["id"] for c in convs if "id" in c]
            for cid in cids:
                self.delete_conversation(cid)
            return len(cids)
        self.client.table("messages").delete().execute()
        res = self.client.table("conversations").delete().execute()
        data = res.data if isinstance(res.data, list) else ([res.data] if res.data else [])
        return len(data)


class AgreementRepository:
    """Manages agreements and version lifecycle persistence."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def create_agreement(
        self,
        analysis_id: str,
        parties: List[str],
        clauses: List[Clause],
        content_hash: Optional[str] = None,
        agreement_id: Optional[str] = None,
    ) -> Agreement:
        ag_id = agreement_id or str(uuid.uuid4())
        valid_analysis_id = ensure_uuid(analysis_id) if is_valid_uuid(analysis_id) else analysis_id
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        # Insert Agreement header
        ag_row = {
            "id": ag_id,
            "analysis_id": valid_analysis_id,
            "parties": parties,
            "current_version": 1,
            "status": AgreementStatus.DRAFT.value,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        self.client.table("agreements").insert(ag_row).execute()

        # Insert Agreement Version 1
        ver_id = str(uuid.uuid4())
        ver_row = {
            "id": ver_id,
            "agreement_id": ag_id,
            "version_number": 1,
            "clauses": [c.model_dump() for c in clauses],
            "content_hash": content_hash,
            "status": "draft",
            "generated_at": now_iso,
        }
        self.client.table("agreement_versions").insert(ver_row).execute()

        v1 = AgreementVersion(
            id=ver_id,
            version_id=ver_id,
            version_number=1,
            clauses=clauses,
            generated_at=now_dt,
            status=AgreementStatus.DRAFT,
            content_hash=content_hash,
        )

        return Agreement(
            id=ag_id,
            analysis_id=valid_analysis_id,
            parties=parties,
            current_version=1,
            status=AgreementStatus.DRAFT,
            versions=[v1],
            created_at=now_dt,
            updated_at=now_dt,
        )

    def get_agreement(self, agreement_id: str) -> Optional[Agreement]:
        res = self.client.table("agreements").select("*").eq("id", agreement_id).execute()
        ag_data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not ag_data and not is_valid_uuid(agreement_id):
            target_id = ensure_uuid(agreement_id)
            res = self.client.table("agreements").select("*").eq("id", target_id).execute()
            ag_data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not ag_data:
            return None

        # Fetch versions
        v_res = (
            self.client.table("agreement_versions")
            .select("*")
            .eq("agreement_id", ag_data["id"])
            .order("version_number", desc=False)
            .execute()
        )
        raw_versions = v_res.data if isinstance(v_res.data, list) else [v_res.data]

        versions = []
        for rv in raw_versions:
            raw_clauses = rv.get("clauses", [])
            clauses = [Clause(**c) if isinstance(c, dict) else c for c in raw_clauses]
            gen_at = rv.get("generated_at")
            if isinstance(gen_at, str):
                gen_at = datetime.fromisoformat(gen_at.replace("Z", "+00:00"))
            elif not isinstance(gen_at, datetime):
                gen_at = datetime.now(timezone.utc)

            ver_uuid = str(rv.get("id")) if rv.get("id") else None
            versions.append(
                AgreementVersion(
                    id=ver_uuid,
                    version_id=ver_uuid,
                    version_number=rv.get("version_number", 1),
                    clauses=clauses,
                    generated_at=gen_at,
                    status=AgreementStatus(rv.get("status", "draft")),
                    content_hash=rv.get("content_hash"),
                )
            )

        c_at = ag_data.get("created_at")
        u_at = ag_data.get("updated_at")
        created_dt = (
            datetime.fromisoformat(c_at.replace("Z", "+00:00"))
            if isinstance(c_at, str)
            else datetime.now(timezone.utc)
        )
        updated_dt = (
            datetime.fromisoformat(u_at.replace("Z", "+00:00"))
            if isinstance(u_at, str)
            else datetime.now(timezone.utc)
        )

        return Agreement(
            id=ag_data["id"],
            analysis_id=ag_data["analysis_id"],
            parties=ag_data.get("parties", []),
            current_version=ag_data.get("current_version", 1),
            status=AgreementStatus(ag_data.get("status", "draft")),
            versions=versions,
            created_at=created_dt,
            updated_at=updated_dt,
        )

    def create_new_version(
        self,
        agreement_id: str,
        clauses: List[Clause],
        content_hash: Optional[str] = None,
    ) -> AgreementVersion:
        agreement = self.get_agreement(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found.")

        new_version_num = agreement.current_version + 1
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        # Mark previous versions as superseded
        self.client.table("agreement_versions").update({"status": "superseded"}).eq(
            "agreement_id", agreement_id
        ).execute()

        # Insert new version
        ver_id = str(uuid.uuid4())
        ver_row = {
            "id": ver_id,
            "agreement_id": agreement_id,
            "version_number": new_version_num,
            "clauses": [c.model_dump() for c in clauses],
            "content_hash": content_hash,
            "status": "draft",
            "generated_at": now_iso,
        }
        self.client.table("agreement_versions").insert(ver_row).execute()

        # Reset confirmations for agreement so assent does not bleed from previous versions
        self.client.table("confirmations").update({
            "confirmed": False,
            "declined": False,
            "confirmed_at": None,
            "declined_at": None,
            "notes": None,
            "decline_reason": None,
            "session_token_hash": None,
            "email_verified_at": None,
            "agreed_version_number": None,
            "agreed_content_hash": None,
        }).eq("agreement_id", agreement_id).execute()

        # Update agreement current_version and reset status to draft
        self.client.table("agreements").update({
            "current_version": new_version_num,
            "status": AgreementStatus.DRAFT.value,
            "updated_at": now_iso,
        }).eq("id", agreement_id).execute()

        return AgreementVersion(
            id=ver_id,
            version_id=ver_id,
            version_number=new_version_num,
            clauses=clauses,
            generated_at=now_dt,
            status=AgreementStatus.DRAFT,
            content_hash=content_hash,
        )


def user_owns_agreement(client, user_id: str, agreement_id: str) -> bool:
    """Checks whether the authenticated user owns the agreement.
    
    Verifies ownership against:
    1. confirmations table initiator_user_id (if recorded)
    2. conversation.user_id via agreements -> analyses -> conversations
    """
    try:
        DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
        # Check if any confirmation record explicitly records initiator_user_id
        conf_res = client.table("confirmations").select("initiator_user_id").eq("agreement_id", agreement_id).execute()
        conf_data = conf_res.data if isinstance(conf_res.data, list) else ([conf_res.data] if conf_res.data else [])
        for crow in conf_data:
            if crow and crow.get("initiator_user_id"):
                return str(crow["initiator_user_id"]) == str(user_id)

        ag_res = client.table("agreements").select("analysis_id").eq("id", agreement_id).execute()
        ag_data = ag_res.data[0] if isinstance(ag_res.data, list) and ag_res.data else ag_res.data
        if not ag_data or not ag_data.get("analysis_id"):
            return settings.ENVIRONMENT == "development" and str(user_id) == DEMO_USER_ID
        analysis_id = ag_data["analysis_id"]

        an_res = client.table("analyses").select("conversation_id").eq("id", analysis_id).execute()
        an_data = an_res.data[0] if isinstance(an_res.data, list) and an_res.data else an_res.data
        if not an_data or not an_data.get("conversation_id"):
            return settings.ENVIRONMENT == "development" and str(user_id) == DEMO_USER_ID
        conv_id = an_data["conversation_id"]

        conv_res = client.table("conversations").select("user_id").eq("id", conv_id).execute()
        conv_data = conv_res.data[0] if isinstance(conv_res.data, list) and conv_res.data else conv_res.data
        if not conv_data or not conv_data.get("user_id"):
            return settings.ENVIRONMENT == "development" and str(user_id) == DEMO_USER_ID

        owner_id = str(conv_data["user_id"])
        return owner_id == str(user_id)
    except Exception:
        return False


class ConfirmationRepository:
    """Manages token-based confirmation links, OTP verification, and status."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Computes SHA-256 digest of secret token for database lookup."""
        return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

    @staticmethod
    def hash_email(email: str) -> str:
        """Computes HMAC-SHA256 digest of normalized email keyed by settings.SECRET_KEY."""
        normalized = email.strip().lower()
        return hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            normalized.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    def hash_sha256(secret: str) -> str:
        """Computes standard SHA-256 digest."""
        return hashlib.sha256(secret.strip().encode("utf-8")).hexdigest()

    @staticmethod
    def mask_email(email: Optional[str]) -> str:
        """Mask email address for privacy (e.g. p***a@e***e.com)."""
        if not email or "@" not in email:
            return ""
        user, domain = email.strip().lower().split("@", 1)
        if len(user) <= 1:
            masked_user = user + "***"
        elif len(user) == 2:
            masked_user = user[0] + "***" + user[1]
        else:
            masked_user = user[0] + "***" + user[-1]

        if "." in domain:
            dom_name, dom_ext = domain.rsplit(".", 1)
            if len(dom_name) <= 1:
                masked_dom = dom_name + "***"
            elif len(dom_name) == 2:
                masked_dom = dom_name[0] + "***" + dom_name[1]
            else:
                masked_dom = dom_name[0] + "***" + dom_name[-1]
            return f"{masked_user}@{masked_dom}.{dom_ext}"
        return f"{masked_user}@{domain}"

    @staticmethod
    def hash_otp(secret_key: str, row_id: str, otp: str) -> str:
        """Computes HMAC-SHA256 digest of 6-digit OTP keyed by SECRET_KEY and row UUID."""
        key = f"{secret_key}:{row_id}".encode("utf-8")
        return hmac.new(key, otp.strip().encode("utf-8"), hashlib.sha256).hexdigest()

    def create_confirmation_tokens(
        self,
        agreement_id: str,
        version_id: str,
        party_names: List[str],
        party_email: Optional[str] = None,
        initiator_user_id: Optional[str] = None,
        hours_valid: int = 72,
    ) -> List[Dict[str, Any]]:
        """Generates single-use confirmation tokens for external counterparties.
        
        Resets verification state, rate-limit counters, and locks on regeneration.
        """
        results = []
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=hours_valid)).isoformat()

        for party in party_names:
            raw_token = secrets.token_urlsafe(32)
            token_hash = self.hash_token(raw_token)

            enc_email = None
            email_hash = None
            if party_email:
                norm_email = party_email.strip().lower()
                enc_email = encrypt_message_content(norm_email)
                email_hash = self.hash_email(norm_email)

            # Check if record already exists for this party to prevent duplicate entries
            existing_res = (
                self.client.table("confirmations")
                .select("*")
                .eq("agreement_id", agreement_id)
                .eq("party_name", party)
                .execute()
            )
            existing = (
                existing_res.data[0]
                if isinstance(existing_res.data, list) and existing_res.data
                else existing_res.data
            )

            update_fields: Dict[str, Any] = {
                "confirmation_token_hash": token_hash,
                "token_expires_at": expires_at,
                "party_email": None,  # never store plaintext email
                "confirmed": False,
                "confirmed_at": None,
                "declined": False,
                "declined_at": None,
                "decline_reason": None,
                "notes": None,
                "email_check_attempts": 0,
                "email_check_passed_at": None,
                "otp_hash": None,
                "otp_expires_at": None,
                "otp_attempts": 0,
                "otp_total_failures": 0,
                "otp_send_count": 0,
                "otp_window_started_at": None,
                "otp_last_sent_at": None,
                "email_verified_at": None,
                "session_token_hash": None,
                "session_expires_at": None,
                "locked_at": None,
                "agreed_version_number": None,
                "agreed_content_hash": None,
            }
            if party_email:
                update_fields["party_email_encrypted"] = enc_email
                update_fields["party_email_hash"] = email_hash
            if initiator_user_id:
                update_fields["initiator_user_id"] = str(initiator_user_id)

            if existing:
                self.client.table("confirmations").update(update_fields).eq("id", existing["id"]).execute()
            else:
                row = {
                    "id": str(uuid.uuid4()),
                    "agreement_id": agreement_id,
                    "version_id": version_id,
                    "party_name": party,
                    **update_fields,
                }
                self.client.table("confirmations").insert(row).execute()

            results.append({
                "party_name": party,
                "raw_token": raw_token,
                "token_hash": token_hash,
                "expires_at": expires_at,
            })
        return results

    def get_confirmation_status(self, agreement_id: str, version_number: int = 1) -> ConfirmationStatus:
        res = (
            self.client.table("confirmations")
            .select("*")
            .eq("agreement_id", agreement_id)
            .execute()
        )
        data = res.data if isinstance(res.data, list) else [res.data]

        party_map: Dict[str, PartyConfirmationRecord] = {}

        for row in data:
            if not row or not row.get("party_name"):
                continue
            p_name = row["party_name"]
            conf_at = row.get("confirmed_at")
            dt = (
                datetime.fromisoformat(conf_at.replace("Z", "+00:00"))
                if isinstance(conf_at, str)
                else None
            )
            dec_at = row.get("declined_at")
            dt_dec = (
                datetime.fromisoformat(dec_at.replace("Z", "+00:00"))
                if isinstance(dec_at, str)
                else None
            )
            ev_at = row.get("email_verified_at")
            dt_ev = (
                datetime.fromisoformat(ev_at.replace("Z", "+00:00"))
                if isinstance(ev_at, str)
                else None
            )

            raw_email = None
            if row.get("party_email_encrypted"):
                try:
                    raw_email = decrypt_message_content(row["party_email_encrypted"])
                except Exception:
                    pass
            elif row.get("party_email"):
                raw_email = row["party_email"]
            masked = self.mask_email(raw_email) if raw_email else None

            method = "email_otp" if row.get("email_verified_at") else ("direct" if row.get("confirmed") else None)

            agreed_ver = row.get("agreed_version_number")
            is_confirmed = bool(row.get("confirmed", False))
            if is_confirmed and agreed_ver is not None and agreed_ver != version_number:
                is_confirmed = False

            rec = PartyConfirmationRecord(
                party_name=p_name,
                party_email=None,  # Never leak plaintext email
                masked_email=masked,
                verification_method=method,
                email_verified_at=dt_ev,
                agreed_version_number=row.get("agreed_version_number"),
                agreed_content_hash=row.get("agreed_content_hash"),
                confirmed=is_confirmed,
                confirmed_at=dt if is_confirmed else None,
                declined=bool(row.get("declined", False)),
                declined_at=dt_dec,
                decline_reason=row.get("decline_reason"),
                notes=row.get("notes"),
                ip_hash=row.get("ip_hash"),
            )
            if p_name not in party_map:
                party_map[p_name] = rec
            elif rec.confirmed and not party_map[p_name].confirmed:
                party_map[p_name] = rec
            elif rec.declined and not party_map[p_name].declined and not party_map[p_name].confirmed:
                party_map[p_name] = rec

        records = list(party_map.values())
        all_conf = len(records) > 0 and all(r.confirmed for r in records)
        any_dec = any(r.declined for r in records)
        return ConfirmationStatus(
            agreement_id=agreement_id,
            version_number=version_number,
            parties=records,
            all_confirmed=all_conf,
            any_declined=any_dec,
            last_updated=datetime.now(timezone.utc),
        )

    def check_email(self, raw_token: str, typed_email: str) -> bool:
        """Compares typed email to stored email hash. Locks link after 5 failed attempts."""
        generic_err = "We couldn't verify this email address."
        token_hash = self.hash_token(raw_token)
        res = self.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
        data = res.data
        row = data[0] if isinstance(data, list) and data else data
        if not row:
            raise ValueError(generic_err)

        if row.get("locked_at"):
            raise PermissionError("This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.")

        exp = row.get("token_expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise ValueError(generic_err)

        stored_email_hash = row.get("party_email_hash")
        if not stored_email_hash:
            raise ValueError(generic_err)

        normalized_typed = typed_email.strip().lower()
        typed_hash = self.hash_email(normalized_typed)

        if not hmac.compare_digest(typed_hash, stored_email_hash):
            attempts = (row.get("email_check_attempts") or 0) + 1
            now_iso = datetime.now(timezone.utc).isoformat()
            audit_repo = AuditRepository(client=self.client)
            if attempts >= 5:
                self.client.table("confirmations").update({
                    "email_check_attempts": attempts,
                    "locked_at": now_iso,
                }).eq("id", row["id"]).execute()
                audit_repo.log_event(
                    entity_type="confirmation",
                    entity_id=row["agreement_id"],
                    action="link_locked",
                    metadata={"party_name": row["party_name"], "reason": "max_email_check_attempts_exceeded"},
                )
                raise PermissionError("This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.")
            else:
                self.client.table("confirmations").update({
                    "email_check_attempts": attempts,
                }).eq("id", row["id"]).execute()
                audit_repo.log_event(
                    entity_type="confirmation",
                    entity_id=row["agreement_id"],
                    action="email_check_failed",
                    metadata={"party_name": row["party_name"], "attempt": attempts},
                )
                raise ValueError(generic_err)

        # Success: match verified
        now_iso = datetime.now(timezone.utc).isoformat()
        self.client.table("confirmations").update({
            "email_check_attempts": 0,
            "email_check_passed_at": now_iso,
        }).eq("id", row["id"]).execute()
        return True

    def send_otp(self, raw_token: str) -> Dict[str, Any]:
        """Dispatches 6-digit OTP to stored email address subject to rate limits."""
        from app.services.email_sender import get_email_sender

        token_hash = self.hash_token(raw_token)
        res = self.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
        data = res.data
        row = data[0] if isinstance(data, list) and data else data
        if not row:
            raise ValueError("Invalid or expired confirmation link.")

        if row.get("locked_at"):
            raise PermissionError("This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.")

        exp = row.get("token_expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise ValueError("Confirmation link has expired.")

        # Email check must have passed within last 15 minutes
        passed_at = row.get("email_check_passed_at")
        if not passed_at:
            raise ValueError("Please verify your email address before requesting a verification code.")
        passed_dt = datetime.fromisoformat(passed_at.replace("Z", "+00:00"))
        now_dt = datetime.now(timezone.utc)
        if (now_dt - passed_dt).total_seconds() > 900:  # 15 minutes
            raise ValueError("Email verification session expired. Please verify your email again.")

        # Rate limiting: max 3 sends per rolling 15 minutes
        window_started = row.get("otp_window_started_at")
        send_count = row.get("otp_send_count") or 0
        if not window_started:
            window_dt = now_dt
            send_count = 0
        else:
            window_dt = datetime.fromisoformat(window_started.replace("Z", "+00:00"))
            if (now_dt - window_dt).total_seconds() > 900:
                window_dt = now_dt
                send_count = 0

        if send_count >= 3:
            raise TimeoutError("Too many OTP requests. Please wait 15 minutes before requesting another code.")

        # Minimum 30s spacing between sends
        last_sent = row.get("otp_last_sent_at")
        if last_sent:
            last_dt = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
            if (now_dt - last_dt).total_seconds() < 30:
                raise TimeoutError("Please wait 30 seconds before requesting another code.")

        # Generate 6-digit OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = self.hash_otp(settings.SECRET_KEY, row["id"], otp)
        otp_expires_at = (now_dt + timedelta(minutes=settings.OTP_TTL_MINUTES)).isoformat()

        # Decrypt target email
        stored_enc = row.get("party_email_encrypted")
        if not stored_enc:
            raise ValueError("No stored email for counterparty.")
        target_email = decrypt_message_content(stored_enc)
        if not target_email or "@" not in target_email:
            raise ValueError("Invalid stored email address.")

        # Send email
        sender = get_email_sender()
        subject = f"Your DealShield Verification Code for {row['party_name']}"
        body = (
            f"Hello,\n\n"
            f"Your single-use verification code to review the commercial agreement is: {otp}\n\n"
            f"This code will expire in {settings.OTP_TTL_MINUTES} minutes.\n\n"
            f"If you did not request this code, you can safely ignore this email.\n\n"
            f"DealShield AI"
        )
        try:
            sender.send(to=target_email, subject=subject, body=body)
        except Exception as e:
            import logging
            logging.getLogger("dealshield.email").error("Failed to send OTP email: %s", e)
            raise RuntimeError("Unable to deliver verification email at this time. Please try again later.")

        # Update row state
        self.client.table("confirmations").update({
            "otp_hash": otp_hash,
            "otp_expires_at": otp_expires_at,
            "otp_attempts": 0,
            "otp_send_count": send_count + 1,
            "otp_window_started_at": window_dt.isoformat(),
            "otp_last_sent_at": now_dt.isoformat(),
        }).eq("id", row["id"]).execute()

        # Append-only audit record (no PII)
        audit_repo = AuditRepository(client=self.client)
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=row["agreement_id"],
            action="otp_sent",
            metadata={"party_name": row["party_name"], "send_count": send_count + 1},
        )

        return {
            "status": "sent",
            "masked_email": self.mask_email(target_email),
        }

    def verify_otp(self, raw_token: str, otp: str) -> Dict[str, Any]:
        """Validates 6-digit OTP and issues a 30-minute review session token."""
        token_hash = self.hash_token(raw_token)
        res = self.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
        data = res.data
        row = data[0] if isinstance(data, list) and data else data
        if not row:
            raise ValueError("Invalid or expired confirmation link.")

        if row.get("locked_at"):
            raise PermissionError("This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.")

        exp = row.get("token_expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise ValueError("Confirmation link has expired.")

        if row.get("confirmed") or row.get("declined"):
            raise ValueError("This confirmation link has already been executed.")

        total_failures = row.get("otp_total_failures") or 0
        if total_failures >= 10:
            raise PermissionError("This confirmation link has been locked due to excessive failed attempts.")

        otp_hash = row.get("otp_hash")
        exp_iso = row.get("otp_expires_at")
        if not otp_hash or not exp_iso:
            raise ValueError("No active verification code. Please request a new code.")

        exp_dt = datetime.fromisoformat(exp_iso.replace("Z", "+00:00"))
        now_dt = datetime.now(timezone.utc)
        if exp_dt < now_dt:
            self.client.table("confirmations").update({"otp_hash": None}).eq("id", row["id"]).execute()
            raise ValueError("Verification code has expired. Please request a new code.")

        provided_hash = self.hash_otp(settings.SECRET_KEY, row["id"], otp.strip())
        if not hmac.compare_digest(provided_hash, otp_hash):
            attempts = (row.get("otp_attempts") or 0) + 1
            total_failures += 1
            now_iso = now_dt.isoformat()
            audit_repo = AuditRepository(client=self.client)

            if total_failures >= 10:
                self.client.table("confirmations").update({
                    "otp_hash": None,
                    "otp_attempts": attempts,
                    "otp_total_failures": total_failures,
                    "locked_at": now_iso,
                }).eq("id", row["id"]).execute()
                audit_repo.log_event(
                    entity_type="confirmation",
                    entity_id=row["agreement_id"],
                    action="link_locked",
                    metadata={"party_name": row["party_name"], "reason": "max_otp_failures_exceeded"},
                )
                raise PermissionError("This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.")
            elif attempts >= 5:
                self.client.table("confirmations").update({
                    "otp_hash": None,
                    "otp_attempts": attempts,
                    "otp_total_failures": total_failures,
                }).eq("id", row["id"]).execute()
                audit_repo.log_event(
                    entity_type="confirmation",
                    entity_id=row["agreement_id"],
                    action="otp_failed",
                    metadata={"party_name": row["party_name"], "attempts": attempts, "total_failures": total_failures},
                )
                raise ValueError("Too many incorrect attempts. Please request a new verification code.")
            else:
                self.client.table("confirmations").update({
                    "otp_attempts": attempts,
                    "otp_total_failures": total_failures,
                }).eq("id", row["id"]).execute()
                audit_repo.log_event(
                    entity_type="confirmation",
                    entity_id=row["agreement_id"],
                    action="otp_failed",
                    metadata={"party_name": row["party_name"], "attempts": attempts, "total_failures": total_failures},
                )
                raise ValueError("Invalid verification code. Please check and try again.")

        # Success: OTP verified
        session_token = secrets.token_urlsafe(32)
        session_token_hash = self.hash_sha256(session_token)
        session_expires_at = (now_dt + timedelta(minutes=settings.SESSION_TTL_MINUTES)).isoformat()

        self.client.table("confirmations").update({
            "otp_hash": None,
            "email_verified_at": now_dt.isoformat(),
            "session_token_hash": session_token_hash,
            "session_expires_at": session_expires_at,
            "otp_attempts": 0,
        }).eq("id", row["id"]).execute()

        audit_repo = AuditRepository(client=self.client)
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=row["agreement_id"],
            action="otp_verified",
            metadata={"party_name": row["party_name"]},
        )

        return {
            "session_token": session_token,
            "expires_at": session_expires_at,
        }

    def is_session_valid(self, row: Dict[str, Any], session_token: Optional[str]) -> bool:
        """Check if provided session token matches active unexpired session."""
        if not session_token or not row:
            return False
        stored_hash = row.get("session_token_hash")
        if not stored_hash:
            return False
        provided_hash = self.hash_sha256(session_token)
        if not hmac.compare_digest(provided_hash, stored_hash):
            return False
        exp_iso = row.get("session_expires_at")
        if not exp_iso:
            return False
        try:
            exp_dt = datetime.fromisoformat(exp_iso.replace("Z", "+00:00"))
            return exp_dt > datetime.now(timezone.utc)
        except Exception:
            return False

    def validate_session(self, raw_token: str, session_token: Optional[str]) -> Dict[str, Any]:
        """Validate session token and return confirmation row. Raises error if invalid."""
        if not session_token:
            raise PermissionError("Missing X-Review-Session header. Please verify your email first.")
        token_hash = self.hash_token(raw_token)
        res = self.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
        data = res.data
        row = data[0] if isinstance(data, list) and data else data
        if not row:
            raise ValueError("Invalid or expired confirmation link.")
        if not self.is_session_valid(row, session_token):
            raise PermissionError("Review session expired or invalid. Please verify your email again.")
        return row

    def submit_confirmation_by_party(
        self,
        agreement_id: str,
        party_name: str,
        confirmed: bool,
        notes: Optional[str] = None,
        client_ip: Optional[str] = None,
        action: str = "agree",
        decline_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Confirms or declines agreement directly for party."""
        # Direct Confirm Rule: Counterparties must use the link flow unless ALLOW_DIRECT_CONFIRM
        if not settings.ALLOW_DIRECT_CONFIRM:
            ag_res = self.client.table("agreements").select("parties").eq("id", agreement_id).execute()
            ag_data = ag_res.data[0] if isinstance(ag_res.data, list) and ag_res.data else ag_res.data
            if ag_data and ag_data.get("parties"):
                parties = ag_data["parties"]
                if isinstance(parties, list) and len(parties) > 0:
                    initiator_party = parties[0]
                    if party_name != initiator_party:
                        raise PermissionError(
                            "Direct confirmation is only allowed for the initiating party. "
                            "Counterparties must confirm via the secure email verification link."
                        )

        now_dt = datetime.now(timezone.utc)
        ip_hash = HashService.hash_ip(client_ip) if client_ip else None

        agreed_version_number = 1
        agreed_content_hash = None
        target_version_id = None
        try:
            ag_res = self.client.table("agreements").select("current_version").eq("id", agreement_id).execute()
            ag_data = ag_res.data[0] if isinstance(ag_res.data, list) and ag_res.data else ag_res.data
            if ag_data and ag_data.get("current_version"):
                agreed_version_number = int(ag_data["current_version"])

            ver_res = (
                self.client.table("agreement_versions")
                .select("id, content_hash")
                .eq("agreement_id", agreement_id)
                .eq("version_number", agreed_version_number)
                .execute()
            )
            ver_data = ver_res.data[0] if isinstance(ver_res.data, list) and ver_res.data else ver_res.data
            if ver_data:
                agreed_content_hash = ver_data.get("content_hash")
                target_version_id = ver_data.get("id")
        except Exception:
            pass

        target_version_id = target_version_id or str(uuid.uuid4())

        is_decline = (action == "decline") or (not confirmed)
        if is_decline:
            update_payload = {
                "confirmed": False,
                "declined": True,
                "declined_at": now_dt.isoformat(),
                "decline_reason": decline_reason or notes,
                "notes": notes,
                "ip_hash": ip_hash,
                "agreed_version_number": agreed_version_number,
                "agreed_content_hash": agreed_content_hash,
            }
        else:
            update_payload = {
                "confirmed": True,
                "declined": False,
                "confirmed_at": now_dt.isoformat(),
                "notes": notes,
                "ip_hash": ip_hash,
                "agreed_version_number": agreed_version_number,
                "agreed_content_hash": agreed_content_hash,
            }

        # Check if row exists for party
        res = (
            self.client.table("confirmations")
            .select("*")
            .eq("agreement_id", agreement_id)
            .eq("party_name", party_name)
            .execute()
        )
        existing = res.data[0] if isinstance(res.data, list) and res.data else res.data

        if existing:
            self.client.table("confirmations").update(update_payload).eq(
                "agreement_id", agreement_id
            ).eq("party_name", party_name).execute()
        else:
            new_row = {
                "id": str(uuid.uuid4()),
                "agreement_id": agreement_id,
                "version_id": target_version_id,
                "party_name": party_name,
                **update_payload,
            }
            self.client.table("confirmations").insert(new_row).execute()

        # Update agreement status
        status = self.get_confirmation_status(agreement_id)
        if is_decline:
            self.client.table("agreements").update({
                "status": AgreementStatus.DECLINED.value
            }).eq("id", agreement_id).execute()
        elif status.all_confirmed:
            self.client.table("agreements").update({
                "status": AgreementStatus.FULLY_CONFIRMED.value
            }).eq("id", agreement_id).execute()
        elif any(r.confirmed for r in status.parties):
            self.client.table("agreements").update({
                "status": AgreementStatus.PARTIALLY_CONFIRMED.value
            }).eq("id", agreement_id).execute()

        return update_payload

    def submit_confirmation_by_token(
        self,
        raw_token: str,
        notes: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        action: str = "agree",
        decline_reason: Optional[str] = None,
        session_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verifies single-use signed token and executes confirmation or decline."""
        if settings.REQUIRE_EMAIL_OTP:
            row = self.validate_session(raw_token, session_token)
            if not row.get("party_email_hash") or not row.get("email_verified_at"):
                raise ValueError("Email verification is required before confirming this agreement.")
        else:
            token_hash = self.hash_token(raw_token)
            res = (
                self.client.table("confirmations")
                .select("*")
                .eq("confirmation_token_hash", token_hash)
                .execute()
            )
            row = res.data[0] if isinstance(res.data, list) and res.data else res.data
            if not row:
                raise ValueError("Invalid or expired confirmation token.")

        if row.get("locked_at"):
            raise PermissionError("This confirmation link has been locked.")

        if row.get("confirmed") or row.get("declined"):
            raise ValueError("This single-use confirmation token has already been executed.")

        exp = row.get("token_expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise ValueError("Confirmation token has expired.")

        now_dt = datetime.now(timezone.utc)
        ip_hash = HashService.hash_ip(client_ip) if client_ip else None
        ag_id = row["agreement_id"]

        agreed_version_number = 1
        agreed_content_hash = None
        try:
            ag_res = self.client.table("agreements").select("current_version").eq("id", ag_id).execute()
            ag_data = ag_res.data[0] if isinstance(ag_res.data, list) and ag_res.data else ag_res.data
            if ag_data and ag_data.get("current_version"):
                agreed_version_number = int(ag_data["current_version"])

            ver_res = self.client.table("agreement_versions").select("content_hash").eq("agreement_id", ag_id).eq("version_number", agreed_version_number).execute()
            ver_data = ver_res.data[0] if isinstance(ver_res.data, list) and ver_res.data else ver_res.data
            if ver_data and ver_data.get("content_hash"):
                agreed_content_hash = ver_data["content_hash"]
        except Exception:
            pass

        is_decline = (action == "decline")
        if is_decline:
            self.client.table("confirmations").update({
                "confirmed": False,
                "declined": True,
                "declined_at": now_dt.isoformat(),
                "decline_reason": decline_reason or notes,
                "notes": notes,
                "ip_hash": ip_hash,
                "user_agent": user_agent,
                "agreed_version_number": agreed_version_number,
                "agreed_content_hash": agreed_content_hash,
                "otp_hash": None,
            }).eq("id", row["id"]).execute()

            self.client.table("agreements").update({
                "status": AgreementStatus.DECLINED.value
            }).eq("id", ag_id).execute()

            self._send_completion_notifications(row, action="declined", decline_reason=decline_reason or notes)

            return {
                "agreement_id": ag_id,
                "party_name": row["party_name"],
                "action": "decline",
                "status": "declined",
                "confirmed": False,
                "declined": True,
                "declined_at": now_dt.isoformat(),
                "decline_reason": decline_reason or notes,
            }

        self.client.table("confirmations").update({
            "confirmed": True,
            "declined": False,
            "confirmed_at": now_dt.isoformat(),
            "notes": notes,
            "ip_hash": ip_hash,
            "user_agent": user_agent,
            "agreed_version_number": agreed_version_number,
            "agreed_content_hash": agreed_content_hash,
            "otp_hash": None,
        }).eq("id", row["id"]).execute()

        # Update agreement status if complete
        status = self.get_confirmation_status(ag_id)
        if status.all_confirmed:
            self.client.table("agreements").update({
                "status": AgreementStatus.FULLY_CONFIRMED.value
            }).eq("id", ag_id).execute()
        elif any(r.confirmed for r in status.parties):
            self.client.table("agreements").update({
                "status": AgreementStatus.PARTIALLY_CONFIRMED.value
            }).eq("id", ag_id).execute()

        self._send_completion_notifications(row, action="confirmed")

        return {
            "agreement_id": ag_id,
            "party_name": row["party_name"],
            "action": "agree",
            "status": "confirmed",
            "confirmed": True,
            "confirmed_at": now_dt.isoformat(),
        }

    def _send_completion_notifications(
        self,
        conf_row: Dict[str, Any],
        action: str,
        decline_reason: Optional[str] = None,
    ) -> None:
        """Send completion email notifications to initiator and counterparty.
        
        Must never fail the parent request.
        """
        try:
            from app.services.email_sender import get_email_sender
            sender = get_email_sender()

            party_name = conf_row.get("party_name", "Counterparty")
            ag_id = conf_row.get("agreement_id", "")

            # 1. Counterparty notification
            counterparty_email = None
            if conf_row.get("party_email_encrypted"):
                try:
                    counterparty_email = decrypt_message_content(conf_row["party_email_encrypted"])
                except Exception:
                    pass

            if counterparty_email:
                cp_subject = f"DealShield: Agreement {action.capitalize()} Confirmation"
                if action == "confirmed":
                    cp_body = (
                        f"Hello {party_name},\n\n"
                        f"Thank you for confirming the commercial agreement (Reference ID: {ag_id}).\n"
                        f"Your electronic assent has been recorded securely with a cryptographic audit trail.\n\n"
                        f"You may download the agreement PDF record using your active review session link.\n\n"
                        f"DealShield AI"
                    )
                else:
                    cp_body = (
                        f"Hello {party_name},\n\n"
                        f"Your decision to decline the commercial agreement (Reference ID: {ag_id}) has been recorded.\n"
                        f"Reason provided: {decline_reason or 'No reason provided'}.\n\n"
                        f"DealShield AI"
                    )
                try:
                    sender.send(to=counterparty_email, subject=cp_subject, body=cp_body)
                except Exception as e:
                    import logging
                    logging.getLogger("dealshield.email").warning("Failed to send counterparty notification: %s", e)

            # 2. Initiator notification
            initiator_email = None
            initiator_id = conf_row.get("initiator_user_id")
            if initiator_id:
                try:
                    user_res = self.client.table("users").select("email").eq("id", initiator_id).execute()
                    user_data = user_res.data[0] if isinstance(user_res.data, list) and user_res.data else user_res.data
                    if user_data and user_data.get("email"):
                        initiator_email = user_data["email"]
                except Exception:
                    pass

            if initiator_email:
                init_subject = f"DealShield: {party_name} has {action} the agreement"
                if action == "confirmed":
                    init_body = (
                        f"Hello,\n\n"
                        f"{party_name} has agreed to and confirmed the commercial agreement (Reference ID: {ag_id}).\n"
                        f"You can view the updated status and download the PDF record from your DealShield dashboard.\n\n"
                        f"DealShield AI"
                    )
                else:
                    init_body = (
                        f"Hello,\n\n"
                        f"{party_name} has declined the commercial agreement (Reference ID: {ag_id}).\n"
                        f"Reason provided: {decline_reason or 'No reason provided'}.\n\n"
                        f"DealShield AI"
                    )
                try:
                    sender.send(to=initiator_email, subject=init_subject, body=init_body)
                except Exception as e:
                    import logging
                    logging.getLogger("dealshield.email").warning("Failed to send initiator notification: %s", e)
        except Exception as e:
            import logging
            logging.getLogger("dealshield.email").warning("Completion notification error: %s", e)


class AuditRepository:
    """Manages append-only immutable audit events."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def log_event(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        row = {
            "id": str(uuid.uuid4()),
            "entity_type": entity_type,
            "entity_id": ensure_uuid(entity_id),
            "action": action,
            "actor_id": ensure_uuid(actor_id) if actor_id else None,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("audit_events").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    record_event = log_event

    def get_audit_trail(self, entity_id: str) -> List[Dict[str, Any]]:
        target_id = ensure_uuid(entity_id)
        res = (
            self.client.table("audit_events")
            .select("*")
            .eq("entity_id", target_id)
            .order("created_at", desc=False)
            .execute()
        )
        data = res.data
        rows = data if isinstance(data, list) else ([data] if data else [])
        if not rows and target_id != entity_id:
            res = (
                self.client.table("audit_events")
                .select("*")
                .eq("entity_id", entity_id)
                .order("created_at", desc=False)
                .execute()
            )
            data = res.data
            rows = data if isinstance(data, list) else ([data] if data else [])
        return rows


class EvidenceRepository:
    """Manages SHA-256 document fingerprint hashes."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def record_document_hash(
        self,
        document_id: str,
        document_type: str,
        hash_value: str,
    ) -> Dict[str, Any]:
        row = {
            "id": str(uuid.uuid4()),
            "document_id": ensure_uuid(document_id),
            "document_type": document_type,
            "hash_algorithm": "sha256",
            "hash_value": hash_value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("document_hashes").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    def get_document_hash(self, document_id: str, document_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        target_id = ensure_uuid(document_id)
        qb = self.client.table("document_hashes").select("*").eq("document_id", target_id)
        if document_type:
            qb = qb.eq("document_type", document_type)
        res = qb.execute()
        data = res.data
        if not data and target_id != document_id:
            qb = self.client.table("document_hashes").select("*").eq("document_id", document_id)
            if document_type:
                qb = qb.eq("document_type", document_type)
            res = qb.execute()
            data = res.data
        if isinstance(data, list):
            return data[0] if data else None
        return data


class AnalysisRepository:
    """Manages legal analysis results persistence."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def save_analysis(self, analysis: AgreementAnalysis) -> Dict[str, Any]:
        analysis_uuid = ensure_uuid(analysis.analysis_id)
        conv_uuid = ensure_uuid(analysis.chat_id)
        analysis.analysis_id = analysis_uuid
        analysis.chat_id = conv_uuid
        row = {
            "id": analysis_uuid,
            "conversation_id": conv_uuid,
            "extracted_terms": [t.model_dump() for t in analysis.extracted_terms],
            "conflicts": [c.model_dump() for c in analysis.conflicts],
            "missing_terms": [m.model_dump() for m in analysis.missing_terms],
            "parties": [p.model_dump() for p in analysis.parties],
            "confidence_score": analysis.confidence_score,
            "requires_human_review": analysis.requires_human_review,
            "analyzed_at": (
                analysis.analyzed_at.isoformat()
                if isinstance(analysis.analyzed_at, datetime)
                else str(analysis.analyzed_at)
            ),
        }
        res = self.client.table("analyses").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    def get_analysis(self, analysis_id: str) -> Optional[AgreementAnalysis]:
        target_id = ensure_uuid(analysis_id)
        res = self.client.table("analyses").select("*").eq("id", target_id).execute()
        data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not data and target_id != analysis_id:
            res = self.client.table("analyses").select("*").eq("id", analysis_id).execute()
            data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not data:
            return None
        an_at = data.get("analyzed_at")
        an_dt = (
            datetime.fromisoformat(an_at.replace("Z", "+00:00"))
            if isinstance(an_at, str)
            else datetime.now(timezone.utc)
        )
        return AgreementAnalysis(
            analysis_id=data["id"],
            chat_id=data.get("conversation_id", ""),
            parties=data.get("parties", []),
            extracted_terms=data.get("extracted_terms", []),
            conflicts=data.get("conflicts", []),
            missing_terms=data.get("missing_terms", []),
            confidence_score=data.get("confidence_score", 0.0),
            requires_human_review=data.get("requires_human_review", True),
            analyzed_at=an_dt,
        )

    def get_analysis_by_chat_id(self, chat_id: str) -> Optional[AgreementAnalysis]:
        target_conv_id = ensure_uuid(chat_id)
        res = self.client.table("analyses").select("*").eq("conversation_id", target_conv_id).execute()
        data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not data and target_conv_id != chat_id:
            res = self.client.table("analyses").select("*").eq("conversation_id", chat_id).execute()
            data = res.data[0] if isinstance(res.data, list) and res.data else res.data
        if not data:
            return None
        an_at = data.get("analyzed_at")
        an_dt = (
            datetime.fromisoformat(an_at.replace("Z", "+00:00"))
            if isinstance(an_at, str)
            else datetime.now(timezone.utc)
        )
        return AgreementAnalysis(
            analysis_id=data["id"],
            chat_id=data.get("conversation_id", ""),
            parties=data.get("parties", []),
            extracted_terms=data.get("extracted_terms", []),
            conflicts=data.get("conflicts", []),
            missing_terms=data.get("missing_terms", []),
            confidence_score=data.get("confidence_score", 0.0),
            requires_human_review=data.get("requires_human_review", True),
            analyzed_at=an_dt,
        )

    def get_analysis_by_chat_id(self, conversation_id: str) -> Optional[AgreementAnalysis]:
        """Retrieves latest legal analysis record for a given conversation."""
        res = (
            self.client.table("analyses")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("analyzed_at", desc=True)
            .execute()
        )
        data = res.data
        if not data:
            return None
        row = data[0] if isinstance(data, list) else data
        an_at = row.get("analyzed_at")
        an_dt = (
            datetime.fromisoformat(an_at.replace("Z", "+00:00"))
            if isinstance(an_at, str)
            else datetime.now(timezone.utc)
        )
        return AgreementAnalysis(
            analysis_id=row["id"],
            chat_id=row.get("conversation_id", ""),
            parties=row.get("parties", []),
            extracted_terms=row.get("extracted_terms", []),
            conflicts=row.get("conflicts", []),
            missing_terms=row.get("missing_terms", []),
            confidence_score=row.get("confidence_score", 0.0),
            requires_human_review=row.get("requires_human_review", True),
            analyzed_at=an_dt,
        )


class UserRepository:
    """Manages user persistence, authentication records, and demo user seeding."""

    DEFAULT_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
    DEFAULT_DEMO_EMAIL = "demo@dealshield.local"
    DEFAULT_DEMO_PASS = "password123"

    def __init__(self, client=None):
        self.client = client or get_supabase_client()
        self._seed_default_demo_user()

    def _seed_default_demo_user(self):
        """Seeds standard demo user if not present (development mode only)."""
        if settings.ENVIRONMENT != "development":
            return
        try:
            existing = self.get_by_email(self.DEFAULT_DEMO_EMAIL)
            if not existing:
                demo_hash = hash_password(self.DEFAULT_DEMO_PASS)
                self.create_user(
                    email=self.DEFAULT_DEMO_EMAIL,
                    password_hash=demo_hash,
                    full_name="Demo User",
                    organization=None,
                    role="Contract Sponsor",
                    user_id=self.DEFAULT_DEMO_USER_ID,
                )
        except Exception:
            pass

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        res = self.client.table("users").select("*").eq("email", clean_email).execute()
        data = res.data
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("users").select("*").eq("id", user_id).execute()
        data = res.data
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def create_user(
        self,
        email: str,
        password_hash: str,
        full_name: str,
        organization: Optional[str] = None,
        role: str = "Contract Sponsor",
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        uid = user_id or str(uuid.uuid4())
        clean_email = email.strip().lower()
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": uid,
            "email": clean_email,
            "password_hash": password_hash,
            "full_name": full_name or "DealShield User",
            "organization": organization,
            "role": role or "Contract Sponsor",
            "created_at": now,
            "updated_at": now,
        }
        res = self.client.table("users").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    def update_user(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        organization: Optional[str] = None,
        role: Optional[str] = None,
        password_hash: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates user profile attributes in Supabase users table."""
        updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if full_name is not None:
            updates["full_name"] = full_name
        if organization is not None:
            updates["organization"] = organization
        if role is not None:
            updates["role"] = role
        if password_hash is not None:
            updates["password_hash"] = password_hash

        res = self.client.table("users").update(updates).eq("id", user_id).execute()
        data = res.data
        if isinstance(data, list) and data:
            return data[0]
        return data or self.get_by_id(user_id)


class DashboardRepository:
    """Manages workspace metrics aggregation and dashboard statistics."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    def get_dashboard_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates live workspace metrics and retrieves recent negotiations from database."""
        # 1. Fetch conversations
        c_query = self.client.table("conversations").select("*")
        if user_id:
            c_query = c_query.eq("user_id", user_id)
        c_res = c_query.order("uploaded_at", desc=True).execute()
        conversations = c_res.data if isinstance(c_res.data, list) else ([c_res.data] if c_res.data else [])

        # 2. Fetch agreements
        ag_res = self.client.table("agreements").select("*").execute()
        agreements = ag_res.data if isinstance(ag_res.data, list) else ([ag_res.data] if ag_res.data else [])

        # 3. Fetch analyses
        an_res = self.client.table("analyses").select("*").execute()
        analyses = an_res.data if isinstance(an_res.data, list) else ([an_res.data] if an_res.data else [])

        # 4. Fetch document hashes (integrity vault)
        h_res = self.client.table("document_hashes").select("*").execute()
        hashes = h_res.data if isinstance(h_res.data, list) else ([h_res.data] if h_res.data else [])

        # 5. Fetch confirmations
        conf_res = self.client.table("confirmations").select("*").execute()
        confirmations = conf_res.data if isinstance(conf_res.data, list) else ([conf_res.data] if conf_res.data else [])

        # Map lookup structures
        analyses_by_conv: Dict[str, Dict[str, Any]] = {}
        for a in analyses:
            cid = a.get("conversation_id")
            if cid:
                analyses_by_conv[str(cid)] = a

        agreements_by_analysis: Dict[str, Dict[str, Any]] = {}
        for ag in agreements:
            an_id = ag.get("analysis_id")
            if an_id:
                agreements_by_analysis[str(an_id)] = ag

        # Aggregate counts
        total_conversations = len(conversations)
        total_agreements = len(agreements)
        confirmed_agreements = sum(1 for ag in agreements if ag.get("status") == "fully_confirmed")
        if confirmed_agreements == 0:
            confirmed_agreements = sum(1 for conf in confirmations if conf.get("confirmed") is True)

        pending_review_count = sum(1 for a in analyses if a.get("requires_human_review") is True)
        total_hashes = len(hashes)

        recent = []
        for c in conversations[:10]:
            cid = str(c.get("id"))
            analysis = analyses_by_conv.get(cid)
            agreement = agreements_by_analysis.get(str(analysis.get("id"))) if analysis else None

            # Determine human-friendly status and UI badge variant
            if agreement:
                ag_status = agreement.get("status", "draft")
                if ag_status == "fully_confirmed":
                    st = "Fully Confirmed"
                    variant = "success"
                elif ag_status == "partially_confirmed":
                    st = "Partially Confirmed"
                    variant = "warning"
                elif ag_status == "declined":
                    st = "Declined"
                    variant = "destructive"
                else:
                    st = "Agreement Generated"
                    variant = "default"
            elif analysis:
                if analysis.get("requires_human_review"):
                    st = "Requires Human Review"
                    variant = "warning"
                else:
                    st = "Analyzed"
                    variant = "secondary"
            else:
                st = "Ready for Analysis"
                variant = "outline"

            recent.append({
                "id": cid,
                "filename": c.get("filename", "chat.txt"),
                "party_names": c.get("party_names") or [],
                "message_count": c.get("message_count", 0),
                "uploaded_at": str(c.get("uploaded_at", "")),
                "analysis_id": analysis.get("id") if analysis else None,
                "agreement_id": agreement.get("id") if agreement else None,
                "requires_human_review": analysis.get("requires_human_review") if analysis else None,
                "status": st,
                "status_variant": variant,
            })

        return {
            "total_conversations": total_conversations,
            "total_agreements": total_agreements,
            "confirmed_agreements": confirmed_agreements,
            "pending_review_count": pending_review_count,
            "total_hashes": total_hashes,
            "recent_conversations": recent,
        }



