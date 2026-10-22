
from decimal import Decimal

from pydantic import BaseModel


class FinancialSummaryResponse(BaseModel):
    """Financial summary for a business."""

    business_id: int
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int
