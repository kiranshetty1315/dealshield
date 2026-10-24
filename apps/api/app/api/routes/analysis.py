from fastapi import APIRouter, HTTPException, status
from app.schemas.analysis import AnalysisRequest, AgreementAnalysis
from app.db.repository import AnalysisRepository

router = APIRouter(prefix="/analysis", tags=["Analysis"])
analysis_repo = AnalysisRepository()


@router.post(
    "",
    response_model=AgreementAnalysis,
    summary="Trigger AI Agreement Analysis",
    description="Extracts terms, detects contradictions, and identifies missing clauses via OpenAI structured outputs."
)
async def analyze_chat(request: AnalysisRequest):
    """Trigger OpenAI agreement analysis.
    
    Assigned to Team C: AI and Legal Intelligence.
    Returns 501 Not Implemented during initial scaffold phase.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "error": "NotImplemented",
            "message": "AI agreement extraction is pending Team C (AI and Legal Intelligence) implementation.",
            "team_owner": "Team C",
            "assigned_branch": "feature/ai-extractor",
            "reference_schema": "packages/contracts/schemas/agreement-analysis.schema.json",
            "sample_response": "packages/contracts/examples/sample-analysis-response.json"
        }
    )


@router.get(
    "/{analysis_id}",
    response_model=AgreementAnalysis,
    summary="Get Analysis Result",
    description="Retrieve stored analysis findings from Supabase."
)
async def get_analysis(analysis_id: str) -> AgreementAnalysis:
    """Retrieve existing analysis record from database."""
    result = analysis_repo.get_analysis(analysis_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis {analysis_id} not found."
        )
    return result
