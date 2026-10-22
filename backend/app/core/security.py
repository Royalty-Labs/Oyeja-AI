from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def _get_jwt_secret() -> str:
    """Return the configured JWT secret or raise a clear error."""
    secret = settings.JWT_SECRET_KEY

    if not secret or not secret.strip():
        raise RuntimeError(
            "JWT_SECRET_KEY is missing. Configure it in the environment."
        )

    return secret


def hash_password(password: str) -> str:
    """Hash a plain-text password for safe database storage."""
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Check a password against its stored hash."""
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token for a user."""
    now = datetime.now(timezone.utc)
    expires_at = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        _get_jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Verify a JWT and return its claims, or None if it is invalid."""
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.InvalidTokenError:
        return None

    if not isinstance(payload.get("sub"), str) or not payload["sub"]:
        return None

    return payload
