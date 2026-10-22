from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.business import BusinessCreate
from app.schemas.transaction import TransactionCreate, TransactionUpdate


def test_business_accepts_valid_data():
    business = BusinessCreate(
        name="Royalty Foods",
        business_type="Retail",
        location="Ado-Ekiti",
    )

    assert business.name == "Royalty Foods"
    assert business.currency == "NGN"


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", "A"),
        ("business_type", "X"),
        ("location", ""),
        ("currency", "NG"),
        ("currency", "NGNN"),
    ],
)
def test_business_rejects_invalid_field_values(field, value):
    data = {
        "name": "Royalty Foods",
        "business_type": "Retail",
        "location": "Ado-Ekiti",
        "currency": "NGN",
    }
    data[field] = value

    with pytest.raises(ValidationError):
        BusinessCreate(**data)


def test_transaction_accepts_valid_income():
    transaction = TransactionCreate(
        business_id=1,
        transaction_type="income",
        amount=Decimal("12500.50"),
        category="Sales",
        occurred_at="2026-10-20T10:30:00Z",
    )

    assert transaction.business_id == 1
    assert transaction.amount == Decimal("12500.50")
    assert transaction.transaction_type == "income"


@pytest.mark.parametrize("transaction_type", ["deposit", "Income", "refund", ""])
def test_transaction_rejects_invalid_type(transaction_type):
    with pytest.raises(ValidationError):
        TransactionCreate(
            business_id=1,
            transaction_type=transaction_type,
            amount=Decimal("100.00"),
            category="Sales",
            occurred_at="2026-10-20T10:30:00Z",
        )


@pytest.mark.parametrize("amount", ["0", "-10.00"])
def test_transaction_rejects_non_positive_amount(amount):
    with pytest.raises(ValidationError):
        TransactionCreate(
            business_id=1,
            transaction_type="expense",
            amount=Decimal(amount),
            category="Supplies",
            occurred_at="2026-10-20T10:30:00Z",
        )


def test_transaction_rejects_invalid_business_id():
    with pytest.raises(ValidationError):
        TransactionCreate(
            business_id=0,
            transaction_type="income",
            amount=Decimal("100.00"),
            category="Sales",
            occurred_at="2026-10-20T10:30:00Z",
        )


def test_transaction_update_accepts_partial_changes():
    update = TransactionUpdate(category="Transport")

    assert update.model_dump(exclude_unset=True) == {
        "category": "Transport"
    }


def test_transaction_update_accepts_optional_description():
    update = TransactionUpdate(description=None)

    assert update.model_dump(exclude_unset=True) == {
        "description": None
    }

@pytest.mark.parametrize(
    "field,value",
    [
        ("transaction_type", None),
        ("amount", None),
        ("category", None),
        ("occurred_at", None),
    ],
)
def test_transaction_update_rejects_null_required_fields(field, value):
    with pytest.raises(ValidationError):
        TransactionUpdate(**{field: value})


def test_transaction_update_allows_clearing_description():
    update = TransactionUpdate(description=None)

    assert update.model_dump(exclude_unset=True) == {
        "description": None
    }
