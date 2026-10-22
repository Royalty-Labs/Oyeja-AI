from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_email(value: str) -> str:
    """Normalize an email address and perform basic format validation."""
    email = value.strip().lower()

    if (
        len(email) > 254
        or email.count("@") != 1
        or any(character.isspace() for character in email)
    ):
        raise ValueError("Enter a valid email address.")

    local_part, domain = email.split("@")

    if (
        not local_part
        or len(local_part) > 64
        or "." not in domain
        or domain.startswith(".")
        or domain.endswith(".")
        or ".." in domain
    ):
        raise ValueError("Enter a valid email address.")

    return email


class UserRegister(BaseModel):
    """Fields required to register a new account."""

    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class UserLogin(BaseModel):
    """Credentials submitted when logging in."""

    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class UserResponse(BaseModel):
    """Public user details; never exposes the password hash."""

    id: int
    email: str
    created_at: object

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """JWT returned after successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
