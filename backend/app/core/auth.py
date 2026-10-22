from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user or reject the request."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required or token is invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    payload = decode_access_token(credentials.credentials)

    if payload is None:
        raise unauthorized

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise unauthorized

    return user
