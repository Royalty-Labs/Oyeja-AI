
from pydantic import BaseModel


class BusinessAIAnalysisResponse(BaseModel):
    """AI-generated analysis based on recorded business data."""

    business_id: int
    model: str
    analysis: str
