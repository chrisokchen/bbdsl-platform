"""Rating and Comment ORM models for community features."""

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rating(Base):
    """Star rating (1-5) for a convention."""

    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint(
            "convention_id", "user_id", name="uq_rating_user_convention"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    convention_id: Mapped[int] = mapped_column(ForeignKey("conventions.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    score: Mapped[int] = mapped_column(Integer)  # 1-5
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    convention: Mapped["Convention"] = relationship(  # noqa: F821
        back_populates="ratings"
    )


class Comment(Base):
    """User comment on a convention."""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    convention_id: Mapped[int] = mapped_column(ForeignKey("conventions.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    author_name: Mapped[str] = mapped_column(String(128), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    convention: Mapped["Convention"] = relationship(  # noqa: F821
        back_populates="comments"
    )
