"""Supabase Repository Layer for DealShield AI.

Implements database persistence operations for conversations, messages,
agreements, confirmations, audit logs, and document hashes according to the
PostgreSQL schema in infra/supabase/migrations/001_initial_schema.sql.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

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
            # Application-level encryption at rest (Fernet AES-256)
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

    def list_conversations(self) -> List[Dict[str, Any]]:
        res = self.client.table("conversations").select("*").order("uploaded_at", desc=True).execute()
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

    def delete_all_conversations(self) -> int:
        """Permanently deletes all stored conversations and messages upon user request."""
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
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        # Insert Agreement header
        ag_row = {
            "id": ag_id,
            "analysis_id": analysis_id,
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
            version_number=1,
            clauses=clauses,
            generated_at=now_dt,
            status=AgreementStatus.DRAFT,
            content_hash=content_hash,
        )

        return Agreement(
            id=ag_id,
            analysis_id=analysis_id,
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
        if not ag_data:
            return None

        # Fetch versions
        v_res = (
            self.client.table("agreement_versions")
            .select("*")
            .eq("agreement_id", agreement_id)
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

            versions.append(
                AgreementVersion(
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
        ver_row = {
            "agreement_id": agreement_id,
            "version_number": new_version_num,
            "clauses": [c.model_dump() for c in clauses],
            "content_hash": content_hash,
            "status": "draft",
            "generated_at": now_iso,
        }
        self.client.table("agreement_versions").insert(ver_row).execute()

        # Update agreement current_version
        self.client.table("agreements").update({
            "current_version": new_version_num,
            "updated_at": now_iso,
        }).eq("id", agreement_id).execute()

        return AgreementVersion(
            version_number=new_version_num,
            clauses=clauses,
            generated_at=now_dt,
            status=AgreementStatus.DRAFT,
            content_hash=content_hash,
        )


class ConfirmationRepository:
    """Manages token-based confirmation links and status."""

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Computes SHA-256 digest of secret token for database lookup."""
        return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

    def create_confirmation_tokens(
        self,
        agreement_id: str,
        version_id: str,
        party_names: List[str],
        hours_valid: int = 72,
    ) -> List[Dict[str, Any]]:
        """Generates single-use confirmation tokens for external counterparties."""
        results = []
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=hours_valid)).isoformat()

        for party in party_names:
            raw_token = secrets.token_urlsafe(32)
            token_hash = self.hash_token(raw_token)

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

            if existing:
                self.client.table("confirmations").update({
                    "confirmation_token_hash": token_hash,
                    "token_expires_at": expires_at,
                }).eq("id", existing["id"]).execute()
            else:
                row = {
                    "id": str(uuid.uuid4()),
                    "agreement_id": agreement_id,
                    "version_id": version_id,
                    "party_name": party,
                    "confirmed": False,
                    "confirmation_token_hash": token_hash,
                    "token_expires_at": expires_at,
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
            rec = PartyConfirmationRecord(
                party_name=p_name,
                confirmed=bool(row.get("confirmed", False)),
                confirmed_at=dt,
                declined=bool(row.get("declined", False)),
                declined_at=dt_dec,
                decline_reason=row.get("decline_reason"),
                notes=row.get("notes"),
                ip_hash=row.get("ip_hash"),
            )
            # Deduplicate by party_name: preserve confirmed=True if any row is confirmed, or declined=True
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
        now_dt = datetime.now(timezone.utc)
        ip_hash = HashService.hash_ip(client_ip) if client_ip else None

        is_decline = (action == "decline") or (not confirmed)
        if is_decline:
            update_payload = {
                "confirmed": False,
                "declined": True,
                "declined_at": now_dt.isoformat(),
                "decline_reason": decline_reason or notes,
                "notes": notes,
                "ip_hash": ip_hash,
            }
        else:
            update_payload = {
                "confirmed": True,
                "declined": False,
                "confirmed_at": now_dt.isoformat(),
                "notes": notes,
                "ip_hash": ip_hash,
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
            # Create confirmation record
            new_row = {
                "id": str(uuid.uuid4()),
                "agreement_id": agreement_id,
                "version_id": str(uuid.uuid4()),
                "party_name": party_name,
                **update_payload,
            }
            self.client.table("confirmations").insert(new_row).execute()

        # Check if all parties confirmed or any declined to update agreement status
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
        action: str = "agree",
        decline_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verifies single-use signed token and executes confirmation or decline."""
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

        is_decline = (action == "decline")
        if is_decline:
            self.client.table("confirmations").update({
                "confirmed": False,
                "declined": True,
                "declined_at": now_dt.isoformat(),
                "decline_reason": decline_reason or notes,
                "notes": notes,
                "ip_hash": ip_hash,
            }).eq("id", row["id"]).execute()

            self.client.table("agreements").update({
                "status": AgreementStatus.DECLINED.value
            }).eq("id", ag_id).execute()

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

        return {
            "agreement_id": ag_id,
            "party_name": row["party_name"],
            "action": "agree",
            "status": "confirmed",
            "confirmed": True,
            "confirmed_at": now_dt.isoformat(),
        }


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
            "entity_id": entity_id,
            "action": action,
            "actor_id": actor_id,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("audit_events").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    def get_audit_trail(self, entity_id: str) -> List[Dict[str, Any]]:
        res = (
            self.client.table("audit_events")
            .select("*")
            .eq("entity_id", entity_id)
            .order("created_at", desc=False)
            .execute()
        )
        data = res.data
        return data if isinstance(data, list) else ([data] if data else [])


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
            "document_id": document_id,
            "document_type": document_type,
            "hash_algorithm": "sha256",
            "hash_value": hash_value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("document_hashes").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data

    def get_document_hash(self, document_id: str, document_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
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
        row = {
            "id": analysis.analysis_id,
            "conversation_id": analysis.chat_id,
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
        """Seeds standard demo user if not present."""
        try:
            existing = self.get_by_email(self.DEFAULT_DEMO_EMAIL)
            if not existing:
                demo_hash = hash_password(self.DEFAULT_DEMO_PASS)
                self.create_user(
                    email=self.DEFAULT_DEMO_EMAIL,
                    password_hash=demo_hash,
                    full_name="Demo User",
                    organization="DealShield LegalTech Hackathon",
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
        organization: str = "DealShield LegalTech Hackathon",
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
            "full_name": full_name or "Demo User",
            "organization": organization or "DealShield LegalTech Hackathon",
            "role": role or "Contract Sponsor",
            "created_at": now,
            "updated_at": now,
        }
        res = self.client.table("users").insert(row).execute()
        return res.data[0] if isinstance(res.data, list) and res.data else res.data


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



