from sqlalchemy import case, func
from app.schemas.financial_summary import FinancialSummaryResponse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from decimal import Decimal 

from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.business import Business
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.schemas.category_breakdown import CategoryBreakdownResponse
from datetime import date, datetime, time, timedelta, timezone
from app.schemas.financial_comparison import (
    FinancialComparisonResponse,
    MonthlyFinancialChanges,
    MonthlyFinancialMetrics,
)
from app.schemas.business_insights import (
    BusinessInsight,
    BusinessInsightsResponse,
)


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.post(
    "/",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == transaction_data.business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    transaction = Transaction(
        business_id=transaction_data.business_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount,
        category=transaction_data.category,
        description=transaction_data.description,
        occurred_at=transaction_data.occurred_at,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get(
    "/business/{business_id}",
    response_model=list[TransactionResponse],
)
def get_business_transactions(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    transactions = (
        db.query(Transaction)
        .join(
            Business,
            Transaction.business_id == Business.id,
        )
        .filter(
            Transaction.business_id == business_id,
            Business.owner_id == current_user.id,
        )
        .order_by(Transaction.occurred_at.desc())
        .all()
    )

    return transactions


@router.get(
    "/business/{business_id}/summary",
    response_model=FinancialSummaryResponse,
)
def get_business_financial_summary(
    business_id: int,
    start_date: date | None = Query(
        default=None,
        description="Start date, inclusive (YYYY-MM-DD).",
    ),
    end_date: date | None = Query(
        default=None,
        description="End date, inclusive (YYYY-MM-DD).",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be on or before end_date.",
        )

    summary_query = db.query(
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "income",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "expense",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_expenses"),
        func.count(Transaction.id).label("transaction_count"),
    ).join(
        Business,
        Transaction.business_id == Business.id,
    ).filter(
        Transaction.business_id == business_id,
        Business.owner_id == current_user.id,
    )

    if start_date is not None:
        start_datetime = datetime.combine(
            start_date,
            time.min,
            tzinfo=timezone.utc,
        )
        summary_query = summary_query.filter(
            Transaction.occurred_at >= start_datetime
        )

    if end_date is not None:
        end_datetime = datetime.combine(
            end_date + timedelta(days=1),
            time.min,
            tzinfo=timezone.utc,
        )
        summary_query = summary_query.filter(
            Transaction.occurred_at < end_datetime
        )

    summary = summary_query.one()

    total_income = summary.total_income
    total_expenses = summary.total_expenses

    return {
        "business_id": business_id,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": total_income - total_expenses,
        "transaction_count": summary.transaction_count,
    }



@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).join(
        Business,
        Transaction.business_id == Business.id,
    ).filter(
        Transaction.id == transaction_id,
        Business.owner_id == current_user.id,
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    update_data = transaction_data.model_dump(
        exclude_unset=True,
    )

    for field, value in update_data.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).join(
        Business,
        Transaction.business_id == Business.id,
    ).filter(
        Transaction.id == transaction_id,
        Business.owner_id == current_user.id,
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    db.delete(transaction)
    db.commit()

    return None


@router.get(
    "/business/{business_id}/category-breakdown",
    response_model=CategoryBreakdownResponse,
)
def get_business_category_breakdown(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    results = (
        db.query(
            Transaction.transaction_type,
            Transaction.category,
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .join(
            Business,
            Transaction.business_id == Business.id,
        )
        .filter(
            Transaction.business_id == business_id,
            Business.owner_id == current_user.id,
        )
        .group_by(
            Transaction.transaction_type,
            Transaction.category,
        )
        .order_by(
            Transaction.transaction_type,
            Transaction.category,
        )
        .all()
    )

    categories = [
        {
            "transaction_type": result.transaction_type,
            "category": result.category,
            "total_amount": result.total_amount,
            "transaction_count": result.transaction_count,
        }
        for result in results
    ]

    return {
        "business_id": business_id,
        "categories": categories,
    }


@router.get(
    "/business/{business_id}/monthly-comparison",
    response_model=FinancialComparisonResponse,
)
def get_monthly_financial_comparison(
    business_id: int,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    # Calculate the selected month's date boundaries.
    current_start_date = date(year, month, 1)

    if month == 12:
        next_start_date = date(year + 1, 1, 1)
    else:
        next_start_date = date(year, month + 1, 1)

    # Calculate the previous month's boundaries.
    if month == 1:
        previous_year = year - 1
        previous_month = 12
    else:
        previous_year = year
        previous_month = month - 1

    previous_start_date = date(
        previous_year,
        previous_month,
        1,
    )

    current_start = datetime.combine(
        current_start_date,
        time.min,
        tzinfo=timezone.utc,
    )
    current_end = datetime.combine(
        next_start_date,
        time.min,
        tzinfo=timezone.utc,
    )
    previous_start = datetime.combine(
        previous_start_date,
        time.min,
        tzinfo=timezone.utc,
    )

    # Reusable function to calculate one month's financial totals.
    def calculate_month_metrics(
        period_start: datetime,
        period_end: datetime,
        period_year: int,
        period_month: int,
    ) -> MonthlyFinancialMetrics:
        summary = db.query(
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.transaction_type == "income",
                            Transaction.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("total_income"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.transaction_type == "expense",
                            Transaction.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("total_expenses"),
            func.count(Transaction.id).label(
                "transaction_count"
            ),
        ).join(
            Business,
            Transaction.business_id == Business.id,
        ).filter(
            Transaction.business_id == business_id,
            Business.owner_id == current_user.id,
            Transaction.occurred_at >= period_start,
            Transaction.occurred_at < period_end,
        ).one()

        return MonthlyFinancialMetrics(
            year=period_year,
            month=period_month,
            total_income=summary.total_income,
            total_expenses=summary.total_expenses,
            net_balance=(
                summary.total_income - summary.total_expenses
            ),
            transaction_count=summary.transaction_count,
        )

    current_metrics = calculate_month_metrics(
        current_start,
        current_end,
        year,
        month,
    )

    previous_metrics = calculate_month_metrics(
        previous_start,
        current_start,
        previous_year,
        previous_month,
    )

    # Calculate percentage change safely.
    def calculate_percentage_change(
        current_value: Decimal,
        previous_value: Decimal,
    ) -> Decimal | None:
        if previous_value == 0:
            return None

        return (
            (current_value - previous_value)
            / abs(previous_value)
        ) * Decimal("100")

    changes = MonthlyFinancialChanges(
        income_change=(
            current_metrics.total_income
            - previous_metrics.total_income
        ),
        expenses_change=(
            current_metrics.total_expenses
            - previous_metrics.total_expenses
        ),
        net_balance_change=(
            current_metrics.net_balance
            - previous_metrics.net_balance
        ),
        income_change_percent=calculate_percentage_change(
            current_metrics.total_income,
            previous_metrics.total_income,
        ),
        expenses_change_percent=calculate_percentage_change(
            current_metrics.total_expenses,
            previous_metrics.total_expenses,
        ),
        net_balance_change_percent=calculate_percentage_change(
            current_metrics.net_balance,
            previous_metrics.net_balance,
        ),
    )

    return FinancialComparisonResponse(
        business_id=business_id,
        current_month=current_metrics,
        previous_month=previous_metrics,
        changes=changes,
    )


@router.get(
    "/business/{business_id}/insights",
    response_model=BusinessInsightsResponse,
)
def get_business_insights(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    summary = db.query(
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "income",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "expense",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_expenses"),
        func.count(Transaction.id).label("transaction_count"),
    ).filter(
        Transaction.business_id == business_id
    ).one()

    total_income = summary.total_income
    total_expenses = summary.total_expenses
    net_balance = total_income - total_expenses

    
    category_results = (
        db.query(
            Transaction.transaction_type,
            Transaction.category,
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .filter(
            Transaction.business_id == business_id
        )
        .group_by(
            Transaction.transaction_type,
            Transaction.category,
        )
        .all()
    )

    expense_categories = [
        item
        for item in category_results
        if item.transaction_type == "expense"
    ]

    income_categories = [
        item
        for item in category_results
        if item.transaction_type == "income"
    ]


    insights = []

    if summary.transaction_count == 0:
        insights.append(
            BusinessInsight(
                title="No transaction data yet",
                message=(
                    "Record your business income and expenses "
                    "to begin receiving financial insights."
                ),
                insight_type="information",
            )
        )
    else:
        if net_balance > 0:
            insights.append(
                BusinessInsight(
                    title="Positive net balance",
                    message=(
                        f"Recorded income exceeds recorded expenses "
                        f"by ₦{net_balance:,.2f}. "
                        "This is your net balance from recorded "
                        "transactions, not necessarily your "
                        "cash available."
                    ),
                    insight_type="positive",
                )
            )
        elif net_balance < 0:
            insights.append(
                BusinessInsight(
                    title="Expenses exceed income",
                    message=(
                        f"Recorded expenses exceed recorded income "
                        f"by ₦{abs(net_balance):,.2f}. "
                        "Review your transactions to understand "
                        "what is driving the difference."
                    ),
                    insight_type="warning",
                )
            )
        else:
            insights.append(
                BusinessInsight(
                    title="Income equals expenses",
                    message=(
                        "Your recorded income and expenses are "
                        "equal, leaving a net balance of zero."
                    ),
                    insight_type="information",
                )
            )

        if total_income > 0:
            expense_ratio = (
                total_expenses / total_income
            ) * Decimal("100")

            insights.append(
                BusinessInsight(
                    title="Expense-to-income ratio",
                    message=(
                        f"Recorded expenses equal "
                        f"{expense_ratio:.1f}% of recorded income. "
                        "Review this alongside your operating "
                        "costs and business goals."
                    ),
                    insight_type="information",
                )
            )
        elif total_expenses > 0:
            insights.append(
                BusinessInsight(
                    title="Expenses recorded without income",
                    message=(
                        "You have recorded expenses but no income. "
                        "Check whether income transactions are "
                        "missing or whether the business has "
                        "incurred costs before making sales."
                    ),
                    insight_type="warning",
                )
            )

            
    if expense_categories and total_expenses > 0:
        largest_expense = max(
            expense_categories,
            key=lambda item: item.total_amount,
        )

        expense_share = (
            largest_expense.total_amount / total_expenses
        ) * Decimal("100")

        insights.append(
            BusinessInsight(
                title="Largest expense category",
                message=(
                    f"{largest_expense.category} accounts for "
                    f"₦{largest_expense.total_amount:,.2f}, "
                    f"or {expense_share:.1f}% of your recorded "
                    "expenses. Review this spending alongside "
                    "your business needs and sales."
                ),
                insight_type="information",
            )
        )

    if income_categories and total_income > 0:
        largest_income = max(
            income_categories,
            key=lambda item: item.total_amount,
        )

        income_share = (
            largest_income.total_amount / total_income
        ) * Decimal("100")

        insights.append(
            BusinessInsight(
                title="Largest income category",
                message=(
                    f"{largest_income.category} accounts for "
                    f"₦{largest_income.total_amount:,.2f}, "
                    f"or {income_share:.1f}% of your recorded "
                    "income."
                ),
                insight_type="information",
            )
        )


    return BusinessInsightsResponse(
        business_id=business_id,
        total_income=total_income,
        total_expenses=total_expenses,
        net_balance=net_balance,
        insights=insights,
    )
