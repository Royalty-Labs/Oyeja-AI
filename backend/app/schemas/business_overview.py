
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.business import BusinessResponse
from app.schemas.financial_summary import FinancialSummaryResponse


class BusinessOverviewResponse(BaseModel):
    """Business profile and financial overview."""

    business: BusinessResponse
    financial_summary: FinancialSummaryResponse
