from typing import Optional
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field
from app.schemas.confirmation import ConfirmationStatus, ConfirmationRequest
from app.db.repository import ConfirmationRepository, AuditRepository

router = APIRouter(prefix="/confirmations", tags=["Confirmations"])

conf_repo = ConfirmationRepository()
audit_repo = AuditRepository()


class TokenConfirmationRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Optional confirmation remarks")


class TokenGenerateRequest(BaseModel):
    agreement_id: str = Field(..., description="Target agreement UUID")
    party_name: str = Field(..., description="Counterparty name to issue link for")
    hours_valid: int = Field(72, description="Token validity window in hours")


class TokenExecuteRequest(BaseModel):
    token: str = Field(..., description="Raw confirmation secret token")
    notes: Optional[str] = Field(None, description="Optional confirmation remarks")


@router.post(
    "/tokens",
    summary="Generate Counterparty Single-Use Signed Token Link",
    description="Generates an unguessable 32-byte URL-safe token link for an external counterparty.",
)
async def generate_counterparty_token(payload: TokenGenerateRequest):
    """Generate shareable single-use link for counterparties without an account."""
    import uuid
    try:
        tokens = conf_repo.create_confirmation_tokens(
            agreement_id=payload.agreement_id,
            version_id=str(uuid.uuid4()),
            party_names=[payload.party_name],
            hours_valid=payload.hours_valid,
        )
        if not tokens:
            raise HTTPException(status_code=400, detail="Failed to generate confirmation token.")

        tok = tokens[0]
        return {
            "status": "success",
            "agreement_id": payload.agreement_id,
            "party_name": payload.party_name,
            "raw_token": tok["raw_token"],
            "token": tok["raw_token"],
            "token_hash": tok["token_hash"],
            "expires_at": tok["expires_at"],
            "confirmation_url": f"/confirmations?token={tok['raw_token']}",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/tokens/confirm",
    summary="Execute Token Confirmation via JSON Payload",
    description="Validates single-use signed token and executes confirmation for external counterparty.",
)
async def execute_token_confirm_json(payload: TokenExecuteRequest, request: Request):
    """JSON payload execution for single-use counterparty tokens."""
    client_ip = request.client.host if request.client else None
    try:
        result = conf_repo.submit_confirmation_by_token(
            raw_token=payload.token,
            notes=payload.notes,
            client_ip=client_ip,
        )
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=result["agreement_id"],
            action="counterparty_token_confirmed",
            metadata={"party_name": result["party_name"]},
        )
        return {
            "status": "confirmed",
            "message": f"Agreement confirmed by {result['party_name']}",
            **result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/token/{token}",
    summary="Inspect Token & Agreement Details",
    description="Validates token and returns counterparty info for review prior to confirmation.",
)
async def inspect_token(token: str):
    """Returns token metadata so counterparty can review agreement before clicking confirm."""
    token_hash = conf_repo.hash_token(token)
    res = conf_repo.client.table("confirmations").select("*").eq("confirmation_token_hash", token_hash).execute()
    data = res.data
    row = data[0] if isinstance(data, list) and data else data
    if not row:
        raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")

    return {
        "token": token,
        "agreement_id": row.get("agreement_id"),
        "party_name": row.get("party_name"),
        "confirmed": bool(row.get("confirmed", False)),
        "confirmed_at": row.get("confirmed_at"),
        "expires_at": row.get("token_expires_at"),
    }


@router.post(
    "",
    response_model=ConfirmationStatus,
    summary="Record Party Confirmation",
    description="Records formal confirmation or notes from one of the negotiating parties and updates agreement status in Supabase.",
)
async def submit_confirmation(
    payload: ConfirmationRequest,
    request: Request,
) -> ConfirmationStatus:
    """Record two-party agreement confirmation with DPDP-compliant IP anonymization."""
    client_ip = request.client.host if request.client else None

    try:
        conf_repo.submit_confirmation_by_party(
            agreement_id=payload.agreement_id,
            party_name=payload.party_name,
            confirmed=payload.confirmed,
            notes=payload.notes,
            client_ip=client_ip,
        )

        # Append-only audit record
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=payload.agreement_id,
            action="party_confirmation_recorded",
            metadata={
                "party_name": payload.party_name,
                "confirmed": payload.confirmed,
                "version_number": payload.version_number,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to record confirmation: {str(e)}"
        )

    return conf_repo.get_confirmation_status(
        agreement_id=payload.agreement_id,
        version_number=payload.version_number,
    )


@router.get(
    "/{agreement_id}",
    response_model=ConfirmationStatus,
    summary="Get Confirmation Status",
    description="Check whether both parties have confirmed the latest agreement version from Supabase.",
)
async def get_confirmation_status(agreement_id: str) -> ConfirmationStatus:
    """Retrieve party confirmation status."""
    return conf_repo.get_confirmation_status(agreement_id=agreement_id)


@router.post(
    "/token/{token}",
    summary="Execute Single-Use Token Confirmation",
    description="Validates single-use signed token for unauthenticated counterparties and executes confirmation.",
)
async def confirm_by_token(
    token: str,
    request: Request,
    payload: Optional[TokenConfirmationRequest] = None,
):
    """Executes single-use signed link confirmation without requiring user account."""
    client_ip = request.client.host if request.client else None
    notes = payload.notes if payload else None

    try:
        result = conf_repo.submit_confirmation_by_token(
            raw_token=token,
            notes=notes,
            client_ip=client_ip,
        )
        audit_repo.log_event(
            entity_type="confirmation",
            entity_id=result["agreement_id"],
            action="counterparty_token_confirmed",
            metadata={
                "party_name": result["party_name"],
            },
        )
        return {
            "status": "confirmed",
            "message": f"Agreement confirmed by {result['party_name']}",
            **result,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
