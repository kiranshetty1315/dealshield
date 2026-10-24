from fastapi import APIRouter, HTTPException, status
from app.schemas.confirmation import ConfirmationStatus, ConfirmationRequest

router = APIRouter(prefix="/confirmations", tags=["Confirmations"])


@router.post(
    "",
    response_model=ConfirmationStatus,
    summary="Record Party Confirmation",
    description="Records formal confirmation or notes from one of the negotiating parties."
)
async def submit_confirmation(request: ConfirmationRequest):
    """Record two-party agreement confirmation.
    
    Assigned to Team D.
    Returns 501 Not Implemented during initial scaffold phase.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "error": "NotImplemented",
            "message": "Two-party confirmation workflow is pending Team D implementation.",
            "team_owner": "Team D",
            "assigned_branch": "feature/two-party-confirmations"
        }
    )


@router.get(
    "/{agreement_id}",
    response_model=ConfirmationStatus,
    summary="Get Confirmation Status",
    description="Check whether both parties have confirmed the latest agreement version."
)
async def get_confirmation_status(agreement_id: str):
    """Retrieve party confirmation status."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Confirmation status retrieval pending Team D Supabase integration."
    )
