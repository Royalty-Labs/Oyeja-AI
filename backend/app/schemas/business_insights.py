
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class BusinessInsight(BaseModel):
    """One finding derived from a business's financial data."""

    title: str
    message: str
    insight_type: Literal["positive", "warning", "information"]


class BusinessInsightsResponse(BaseModel):
    """Financial findings generated for a business."""

    business_id: int
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    insights: list[BusinessInsight]
