from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", name="fk_businesses_owner_id_users"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    business_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="NGN",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    owner: Mapped["User | None"] = relationship(
        back_populates="businesses",
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="business",
        cascade="all, delete-orphan",
    )
