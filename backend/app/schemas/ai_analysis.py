from decimal import Decimal

from pydantic import BaseModel


class FinancialEvidence(BaseModel):
    """Authoritative financial figures calculated by the backend."""

    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int


class DerivedFinancialMetrics(BaseModel):
    """Additional metrics calculated from recorded transactions."""

    expense_to_income_percentage: float | None
    income_transaction_count: int
    expense_transaction_count: int


class CategoryEvidence(BaseModel):
    """Recorded totals grouped by transaction type and category."""

    transaction_type: str
    category: str
    total_amount: Decimal
    transaction_count: int


class BusinessAIAnalysisResponse(BaseModel):
    """Financial evidence separated from AI-generated interpretation."""

    business_id: int
    model: str
    financial_summary: FinancialEvidence
    derived_metrics: DerivedFinancialMetrics
    category_breakdown: list[CategoryEvidence]
    analysis: str
