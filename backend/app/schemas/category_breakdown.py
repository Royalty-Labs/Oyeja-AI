
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    """Financial totals for one transaction category."""

    transaction_type: Literal["income", "expense"]
    category: str
    total_amount: Decimal
    transaction_count: int


class CategoryBreakdownResponse(BaseModel):
    """Category breakdown for a business."""

    business_id: int
    categories: list[CategoryBreakdownItem]
