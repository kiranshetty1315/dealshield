"""DealShield AI — Confirmation & Counterparty Verification Endpoints.

Handles two-party confirmation workflow, email-OTP counterparty authentication,
session issuance, assent recording, and audit trails.
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, get_client_ip
from app.core.config import settings
from app.core.security import decrypt_message_content
from app.db.repository import (
    ConfirmationRepository,
    AuditRepository,
    AgreementRepository,
    user_owns_agreement,
)
from app.schemas.confirmation import (
    ConfirmationStatus,
    ConfirmationRequest,
    TokenCreateRequest,
    EmailCheckRequest,
    OtpVerifyRequest,
    SessionResponse,
    TokenInspectResponse,
)

router = APIRouter(prefix="/confirmations", tags=["Confirmations"])

conf_repo = ConfirmationRepository()
audit_repo = AuditRepository()


class TokenConfirmationRequest(BaseModel):
    action: str = Field("agree", description="'agree' or 'decline'")
    notes: Optional[str] = Field(None, description="Optional confirmation remarks")
    decline_reason: Optional[str] = Field(None, description="Reason for declining or requested changes")


class TokenExecuteRequest(BaseModel):
    token: str = Field(..., description="Raw confirmation secret token")
    action: str = Field("agree", description="'agree' or 'decline'")
    notes: Optional[str] = Field(None, description="Optional confirmation remarks")
    decline_reason: Optional[str] = Field(None, description="Reason for declining or requested changes")


@router.post(
    "/tokens",
    summary="Generate Counterparty Single-Use Signed Token Link",
    description="Generates an unguessable 32-byte URL-safe token link for an external counterparty.",
)
async def generate_counterparty_token(
    payload: TokenCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate shareable single-use link for counterparties without requiring an account.
    
    Requires Bearer token. Enforces ownership check, counterparty email format,
    rejects initiator's own email, and prevents regeneration for confirmed parties.
    """
    clean_email = payload.party_email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid counterparty email address.",
        )

    # Reject if party_email equals authenticated initiator's own email
    initiator_email = current_user.get("email", "").strip().lower()
    if clean_email == initiator_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Counterparty email cannot be your own initiator account email.",
        )

    # Ownership check
    if not user_owns_agreement(conf_repo.client, current_user["id"], payload.agreement_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to generate confirmation links for this agreement.",
        )

    # Reject regeneration for a party who already confirmed
    status_rec = conf_repo.get_confirmation_status(payload.agreement_id)
    for p in status_rec.parties:
        if p.party_name == payload.party_name and p.confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Party '{payload.party_name}' has already confirmed this agreement. Regeneration is not permitted.",
            )

    # Fetch agreement and latest version UUID to avoid FK violations
    ag_repo = AgreementRepository(client=conf_repo.client)
    agreement = ag_repo.get_agreement(payload.agreement_id)
    if not agreement or not agreement.versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agreement {payload.agreement_id} not found.",
        )
    latest_ver = agreement.versions[-1]
    version_id = getattr(latest_ver, "version_id", None) or getattr(latest_ver, "id", None) or payload.agreement_id

    clean_gst = payload.gst_number.strip().upper() if payload.gst_number else None
    clean_pan = payload.pan_last_4.strip().upper() if payload.pan_last_4 else None
    clean_address = payload.office_address.strip() if payload.office_address else None

    try:
        tokens = conf_repo.create_confirmation_tokens(
            agreement_id=payload.agreement_id,
            version_id=str(version_id),
            party_names=[payload.party_name],
            party_email=clean_email,
            initiator_user_id=current_user["id"],
            hours_valid=payload.hours_valid,
            gst_number=clean_gst,
            pan_last_4=clean_pan,
            office_address=clean_address,
        )
        if not tokens:
            raise HTTPException(status_code=400, detail="Failed to generate confirmation token.")

        tok = tokens[0]
        masked = conf_repo.mask_email(clean_email)
        # Return URL without agreement_id query param to prevent URL leak
        confirmation_url = f"/review?token={tok['raw_token']}"

        # Append-only audit record (no raw sensitive data in metadata)
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=payload.agreement_id,
            action="confirmation_link_created",
            actor_id=current_user["id"],
            metadata={
                "has_gst": bool(clean_gst),
                "has_pan": bool(clean_pan),
                "has_address": bool(clean_address),
                "expires_at": tok["expires_at"],
            },
        )

        return {
            "status": "success",
            "agreement_id": payload.agreement_id,
            "party_name": payload.party_name,
            "raw_token": tok["raw_token"],
            "token": tok["raw_token"],
            "masked_email": masked,
            "gst_number": clean_gst,
            "pan_last_4": clean_pan,
            "office_address": clean_address,
            "expires_at": tok["expires_at"],
            "confirmation_url": confirmation_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/token/{token}",
    response_model=TokenInspectResponse,
    summary="Inspect Token & Agreement Details",
    description="Side-effect free endpoint. Returns counterparty metadata, masking email, and full agreement details only after successful session authentication.",
)
async def inspect_token(
    token: str,
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
):
    """Side-effect free inspect endpoint safe for messaging/browser prefetches."""
    token_hash = conf_repo.hash_token(token)
    res = conf_repo.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
    data = res.data
    row = data[0] if isinstance(data, list) and data else data
    if not row:
        raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")

    if row.get("locked_at"):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="This confirmation link has been locked due to excessive failed attempts. Please ask the initiator to generate a new link.",
        )

    exp = row.get("token_expires_at")
    if exp:
        exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp_dt < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Confirmation link has expired.")

    has_valid_session = conf_repo.is_session_valid(row, x_review_session)

    # Agreement draft is strictly hidden until session token is verified (unless REQUIRE_EMAIL_OTP is False)
    agreement_data = None
    if (not settings.REQUIRE_EMAIL_OTP) or has_valid_session:
        ag_id = row.get("agreement_id")
        if ag_id:
            try:
                ag_repo = AgreementRepository(client=conf_repo.client)
                ag = ag_repo.get_agreement(ag_id)
                if ag:
                    agreement_data = ag.model_dump()
            except Exception:
                agreement_data = None

    raw_email = None
    if row.get("party_email_encrypted"):
        try:
            raw_email = decrypt_message_content(row["party_email_encrypted"])
        except Exception:
            pass
    elif row.get("party_email"):
        raw_email = row["party_email"]

    masked = conf_repo.mask_email(raw_email) if raw_email else None
    requires_verification = settings.REQUIRE_EMAIL_OTP and not has_valid_session

    pan_last_4_raw = row.get("pan_last_4_encrypted") or row.get("pan_last_4")
    pan_last_4_val = decrypt_message_content(pan_last_4_raw) if (has_valid_session and pan_last_4_raw) else None

    gst_raw = row.get("gst_number_encrypted") or row.get("gst_number")
    gst_val = decrypt_message_content(gst_raw) if gst_raw else None

    addr_raw = row.get("office_address_encrypted") or row.get("office_address")
    addr_val = decrypt_message_content(addr_raw) if addr_raw else None

    p_name = decrypt_message_content(row.get("party_name", ""))

    return TokenInspectResponse(
        token=token,
        party_name=p_name,
        masked_email=masked,
        gst_number=gst_val,
        pan_last_4=pan_last_4_val,
        office_address=addr_val,
        has_pan_check=bool(pan_last_4_raw),
        confirmed=bool(row.get("confirmed", False)),
        confirmed_at=row.get("confirmed_at"),
        declined=bool(row.get("declined", False)),
        declined_at=row.get("declined_at"),
        decline_reason=row.get("decline_reason"),
        expires_at=row.get("token_expires_at"),
        requires_email_verification=requires_verification,
        agreement=agreement_data,
    )


@router.post(
    "/token/{token}/email-check",
    summary="Verify Counterparty Email & Business PAN Hash",
    description="Zero-knowledge email check: compares client-entered email HMAC and Business PAN to stored credentials.",
)
async def check_counterparty_email(token: str, payload: EmailCheckRequest):
    """Compares entered email and Business PAN to stored recipient hash. Locks after 5 failed guesses."""
    clean_email = payload.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid email address.",
        )
    clean_pan = payload.pan_last_4.strip().upper() if payload.pan_last_4 else None
    try:
        conf_repo.check_email(raw_token=token, typed_email=clean_email, typed_pan_last_4=clean_pan)
        return {
            "status": "verified",
            "message": "Credentials verified. You may now request a verification code.",
        }
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/token/{token}/otp/send",
    summary="Dispatch Single-Use Verification OTP",
    description="Generates and emails a 6-digit verification code to the stored counterparty email address.",
)
async def send_counterparty_otp(token: str):
    """Dispatches 6-digit OTP to stored email address subject to rolling rate limits."""
    try:
        result = await asyncio.to_thread(conf_repo.send_otp, raw_token=token)
        return {
            "status": "sent",
            "masked_email": result["masked_email"],
            "message": f"Verification code sent to {result['masked_email']}.",
        }
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/token/{token}/otp/verify",
    response_model=SessionResponse,
    summary="Verify Counterparty OTP & Issue Review Session",
    description="Validates the 6-digit OTP and returns a 30-minute review session token.",
)
async def verify_counterparty_otp(token: str, payload: OtpVerifyRequest):
    """Verifies OTP and issues a signed session token for viewing draft and agreeing."""
    if not payload.otp or len(payload.otp.strip()) != 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Verification code must be exactly 6 digits.",
        )
    try:
        result = conf_repo.verify_otp(raw_token=token, otp=payload.otp.strip())
        return SessionResponse(
            session_token=result["session_token"],
            expires_at=result["expires_at"],
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/token/{token}",
    summary="Execute Single-Use Token Confirmation",
    description="Validates review session and single-use signed token to record counterparty assent or decline.",
)
async def confirm_by_token(
    token: str,
    request: Request,
    payload: Optional[TokenConfirmationRequest] = None,
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
):
    """Executes single-use signed link confirmation without requiring user account."""
    client_ip = request.client.host if request.client else None
    notes = payload.notes if payload else None
    action = payload.action if payload else "agree"
    decline_reason = payload.decline_reason if payload else None

    try:
        result = conf_repo.submit_confirmation_by_token(
            raw_token=token,
            notes=notes,
            client_ip=client_ip,
            user_agent=user_agent,
            action=action,
            decline_reason=decline_reason,
            session_token=x_review_session,
        )
        audit_action = "counterparty_declined" if action == "decline" else "counterparty_agreed"
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=result["agreement_id"],
            action=audit_action,
            metadata={
                "party_name": result["party_name"],
                "action": action,
                "reason": decline_reason,
            },
        )
        verb = "declined" if action == "decline" else "confirmed"
        return {
            "status": result.get("action", verb),
            "message": f"Agreement {verb} by {result['party_name']}",
            **result,
        }
    except PermissionError as e:
        err_msg = str(e)
        status_code = status.HTTP_401_UNAUTHORIZED if "Session" in err_msg or "session" in err_msg else status.HTTP_423_LOCKED
        raise HTTPException(status_code=status_code, detail=err_msg)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/tokens/confirm",
    summary="Execute Token Confirmation via JSON Payload",
    description="Validates review session and single-use signed token to record counterparty assent or decline.",
)
async def execute_token_confirm_json(
    payload: TokenExecuteRequest,
    request: Request,
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
):
    """JSON payload execution for single-use counterparty tokens."""
    client_ip = get_client_ip(request)
    try:
        result = conf_repo.submit_confirmation_by_token(
            raw_token=payload.token,
            notes=payload.notes,
            client_ip=client_ip,
            user_agent=user_agent,
            action=payload.action,
            decline_reason=payload.decline_reason,
            session_token=x_review_session,
        )
        audit_action = "counterparty_declined" if payload.action == "decline" else "counterparty_agreed"
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=result["agreement_id"],
            action=audit_action,
            metadata={
                "party_name": result["party_name"],
                "action": payload.action,
                "reason": payload.decline_reason,
            },
        )
        verb = "declined" if payload.action == "decline" else "confirmed"
        return {
            "status": result.get("status", verb),
            "message": f"Agreement {verb} by {result['party_name']}",
            **result,
        }
    except PermissionError as e:
        err_msg = str(e)
        status_code = status.HTTP_401_UNAUTHORIZED if "Session" in err_msg or "session" in err_msg else status.HTTP_423_LOCKED
        raise HTTPException(status_code=status_code, detail=err_msg)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/token/{token}/download",
    summary="Download Confirmed Agreement PDF via Counterparty Review Session",
    description="Allows counterparty to download the signed agreement PDF record using their active review session.",
)
async def download_counterparty_pdf(
    token: str,
    x_review_session: Optional[str] = Header(None, alias="X-Review-Session"),
):
    """Downloads confirmed agreement PDF using active counterparty session."""
    try:
        conf_row = conf_repo.validate_session(raw_token=token, session_token=x_review_session)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    if not conf_row.get("confirmed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agreement has not been confirmed yet. PDF download is available only after confirmation.",
        )

    ag_id = conf_row.get("agreement_id")
    from app.services.agreement_generator import AgreementGeneratorService
    from app.services.stamp_pdf_generator import StampPaperPdfService
    import hashlib

    ag_repo = AgreementRepository(client=conf_repo.client)
    agreement = ag_repo.get_agreement(ag_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement record not found.")

    pdf_bytes = StampPaperPdfService.generate_pdf(agreement)
    pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

    # Log audit event with computed PDF SHA-256 fingerprint
    audit_repo.log_event(
        entity_type="agreement",
        entity_id=agreement.id,
        action="agreement_pdf_exported",
        metadata={
            "format": "pdf",
            "exporter": conf_row.get("party_name"),
            "method": "counterparty_session",
            "pdf_sha256": pdf_sha256,
        },
    )

    filename = f"DealShield_Agreement_{agreement.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-DealShield-Hash": pdf_sha256,
        },
    )


@router.post(
    "",
    response_model=ConfirmationStatus,
    summary="Record Party Confirmation",
    description="Records formal confirmation from the initiating party. Counterparties must confirm via secure email verification link.",
)
async def submit_confirmation(
    payload: ConfirmationRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
) -> ConfirmationStatus:
    """Record two-party agreement confirmation with Bearer token authentication."""
    # Ownership verification: ensure authenticated user owns the agreement
    if not user_owns_agreement(conf_repo.client, current_user["id"], payload.agreement_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to confirm this agreement directly.",
        )

    client_ip = get_client_ip(request)

    try:
        conf_repo.submit_confirmation_by_party(
            agreement_id=payload.agreement_id,
            party_name=payload.party_name,
            confirmed=payload.confirmed,
            notes=payload.notes,
            client_ip=client_ip,
            action=payload.action or "agree",
            decline_reason=payload.decline_reason,
        )

        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=payload.agreement_id,
            action="party_confirmation_recorded",
            actor_id=current_user.get("id"),
            metadata={
                "party_name": payload.party_name,
                "confirmed": payload.confirmed,
                "version_number": payload.version_number,
                "method": "direct_initiator",
            },
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to record confirmation: {str(e)}",
        )

    return conf_repo.get_confirmation_status(
        agreement_id=payload.agreement_id,
        version_number=payload.version_number,
    )


@router.get(
    "/{agreement_id}",
    response_model=ConfirmationStatus,
    summary="Get Confirmation Status",
    description="Check whether parties have confirmed the latest agreement version.",
)
async def get_confirmation_status(agreement_id: str) -> ConfirmationStatus:
    """Retrieve party confirmation status."""
    return conf_repo.get_confirmation_status(agreement_id=agreement_id)
