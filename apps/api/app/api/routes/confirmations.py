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
