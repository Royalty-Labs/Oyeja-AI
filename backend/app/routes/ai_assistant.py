from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.ai.chat_service import generate_chat_reply
from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.business import Business
from app.models.transaction import Transaction
from app.models.user import User


router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    business_id: int = Field(gt=0)
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)


class ChatResponse(BaseModel):
    business_id: int
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only allow access to a business owned by the authenticated user.
    business = db.query(Business).filter(
        Business.id == payload.business_id,
        Business.owner_id == current_user.id,
    ).first()

    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    messages = [message.model_dump() for message in payload.messages]

    if messages[-1]["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The last message must be a user message.",
        )

    totals = db.query(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.transaction_type == "income", Transaction.amount),
                    else_=0,
                )
            ),
            0,
        ).label("income"),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.transaction_type == "expense", Transaction.amount),
                    else_=0,
                )
            ),
            0,
        ).label("expenses"),
        func.count(Transaction.id).label("transaction_count"),
    ).filter(
        Transaction.business_id == business.id
    ).one()

    categories = db.query(
        Transaction.transaction_type,
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.business_id == business.id
    ).group_by(
        Transaction.transaction_type,
        Transaction.category,
    ).all()

    recent = db.query(Transaction).filter(
        Transaction.business_id == business.id
    ).order_by(
        Transaction.occurred_at.desc()
    ).limit(10).all()

    income = Decimal(str(totals.income or 0))
    expenses = Decimal(str(totals.expenses or 0))

    business_context = {
        "business": {
            "name": business.name,
            "business_type": business.business_type,
            "location": business.location,
            "currency": business.currency,
        },
        "financial_summary": {
            "recorded_income": str(income),
            "recorded_expenses": str(expenses),
            "recorded_net_balance": str(income - expenses),
            "transaction_count": totals.transaction_count,
        },
        "category_breakdown": [
            {
                "type": row.transaction_type,
                "category": row.category,
                "total_amount": str(row.total),
                "transaction_count": row.count,
            }
            for row in categories
        ],
        "recent_transactions": [
            {
                "type": transaction.transaction_type,
                "amount": str(transaction.amount),
                "category": transaction.category,
                "description": transaction.description,
                "date": transaction.occurred_at.isoformat(),
            }
            for transaction in recent
        ],
        "limitations": [
            "Only recorded transactions are included.",
            "The recent transaction list is limited to 10 records.",
            "No inventory data or unrecorded financial activity is assumed.",
        ],
    }

    try:
        answer = generate_chat_reply(business_context, messages)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {"business_id": business.id, "answer": answer}
