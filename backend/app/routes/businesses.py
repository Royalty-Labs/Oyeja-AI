from sqlalchemy import case, func

from app.models.transaction import Transaction
from app.schemas.business_overview import BusinessOverviewResponse

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessResponse


router = APIRouter(
    prefix="/businesses",
    tags=["Businesses"],
)


@router.post(
    "/",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business(
    business_data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = Business(
        **business_data.model_dump(),
        owner_id=current_user.id,
    )

    db.add(business)
    db.commit()
    db.refresh(business)

    return business


@router.get(
    "/{business_id}",
    response_model=BusinessResponse,
)
def get_business(
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

    return business



@router.get(
    "/{business_id}/overview",
    response_model=BusinessOverviewResponse,
)
def get_business_overview(
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
        ).join(
        Business,
        Transaction.business_id == Business.id,
    ).filter(
        Transaction.business_id == business_id,
        Business.owner_id == current_user.id,
    ).one()

    total_income = summary.total_income
    total_expenses = summary.total_expenses

    financial_summary = {
        "business_id": business_id,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": total_income - total_expenses,
        "transaction_count": summary.transaction_count,
    }

    return {
        "business": business,
        "financial_summary": financial_summary,
    }
