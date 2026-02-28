"""Namespace ORM model for the Registry."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Namespace(Base):
    """A registered namespace owned by a user.

    Namespaces act as a prefix for conventions (e.g. ``precision/``,
    ``sayc/``).  A user must first claim a namespace before publishing
    conventions under it.
    """

    __tablename__ = "namespaces"
    __table_args__ = (
        UniqueConstraint("prefix", name="uq_namespace_prefix"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    prefix: Mapped[str] = mapped_column(String(128), index=True, unique=True)
    display_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner: Mapped["User"] = relationship(  # noqa: F821
        back_populates="namespaces", lazy="selectin"
    )
