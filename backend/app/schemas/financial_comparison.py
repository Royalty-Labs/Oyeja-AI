
from decimal import Decimal

from pydantic import BaseModel


class MonthlyFinancialMetrics(BaseModel):
    """Financial totals for one month."""

    year: int
    month: int
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int


class MonthlyFinancialChanges(BaseModel):
    """Changes between the selected month and the previous month."""

    income_change: Decimal
    expenses_change: Decimal
    net_balance_change: Decimal

    income_change_percent: Decimal | None
    expenses_change_percent: Decimal | None
    net_balance_change_percent: Decimal | None


class FinancialComparisonResponse(BaseModel):
    """Month-over-month financial comparison for a business."""

    business_id: int
    current_month: MonthlyFinancialMetrics
    previous_month: MonthlyFinancialMetrics
    changes: MonthlyFinancialChanges
