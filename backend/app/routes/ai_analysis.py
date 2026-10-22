
from app.core.config import settings

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.ai.ai_service import generate_business_analysis
from app.db.database import get_db
from app.models.business import Business
from app.models.transaction import Transaction
from app.schemas.ai_analysis import BusinessAIAnalysisResponse


router = APIRouter(
    prefix="/businesses",
    tags=["AI Analysis"],
)


@router.get(
    "/{business_id}/ai-analysis",
    response_model=BusinessAIAnalysisResponse,
)
def analyze_business(
    business_id: int,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(
        Business.id == business_id
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

    category_rows = db.query(
        Transaction.transaction_type,
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.business_id == business_id
    ).group_by(
        Transaction.transaction_type,
        Transaction.category,
    ).all()

    recent_transactions = db.query(Transaction).filter(
        Transaction.business_id == business_id
    ).order_by(
        Transaction.occurred_at.desc()
    ).limit(5).all()

    total_income = summary.total_income
    total_expenses = summary.total_expenses

    income_transaction_count = sum(
        row.count
        for row in category_rows
        if row.transaction_type == "income"
    )

    expense_transaction_count = sum(
        row.count
        for row in category_rows
        if row.transaction_type == "expense"
    )

    expense_to_income_percentage = (
        round(float(total_expenses / total_income * 100), 2)
        if total_income > 0
        else None
    )

    business_context = {
        "business": {
            "id": business.id,
            "name": business.name,
            "business_type": business.business_type,
            "location": business.location,
            "currency": business.currency,
        },
        "financial_summary": {
            "total_income": str(total_income),
            "total_expenses": str(total_expenses),
            "net_balance": str(total_income - total_expenses),
            "transaction_count": summary.transaction_count,
        },
        "derived_metrics": {
            "expense_to_income_percentage": expense_to_income_percentage,
            "income_transaction_count": income_transaction_count,
            "expense_transaction_count": expense_transaction_count,
            "interpretation": (
                "The expense-to-income percentage compares recorded "
                "expenses with recorded income. It is not a profit margin."
            ),
        },
        "category_breakdown": [
            {
                "transaction_type": row.transaction_type,
                "category": row.category,
                "total_amount": str(row.total),
                "transaction_count": row.count,
            }
            for row in category_rows
        ],
        "recent_transactions": [
            {
                "transaction_type": transaction.transaction_type,
                "amount": str(transaction.amount),
                "category": transaction.category,
                "description": transaction.description,
                "occurred_at": transaction.occurred_at.isoformat(),
            }
            for transaction in recent_transactions
        ],
        "limitations": [
            "Only recorded transactions are available.",
            "Net balance is not verified cash available.",
            "The recent transaction list contains at most 5 records.",
            "Recorded income and expenses alone do not establish "
            "long-term profitability.",
        ],
    }

    try:
        analysis = generate_business_analysis(business_context)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "business_id": business.id,
        "model": settings.OYEJA_AI_MODEL or "local-model",
        "analysis": analysis,
    }
