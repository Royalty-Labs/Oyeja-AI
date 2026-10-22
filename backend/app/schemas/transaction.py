
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    """Fields required to record a business transaction."""

    business_id: int = Field(gt=0)

    transaction_type: str = Field(
        pattern=r"^(income|expense)$",
    )

    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)

    category: str = Field(
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    occurred_at: datetime


class TransactionResponse(BaseModel):
    """Fields returned when a transaction is retrieved."""

    id: int
    business_id: int
    transaction_type: str
    amount: Decimal
    category: str
    description: str | None
    occurred_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class TransactionUpdate(BaseModel):
    """Fields that can be updated on an existing transaction."""

    transaction_type: str | None = Field(
        default=None,
        pattern=r"^(income|expense)$",
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    category: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    occurred_at: datetime | None = None
