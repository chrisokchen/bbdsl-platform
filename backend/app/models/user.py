"""User ORM model."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """Platform user (authenticated via GitHub or Google OAuth)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    github_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    google_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conventions: Mapped[list["Convention"]] = relationship(  # noqa: F821
        back_populates="author", lazy="selectin"
    )
    namespaces: Mapped[list["Namespace"]] = relationship(  # noqa: F821
        back_populates="owner", lazy="selectin"
    )
    drafts: Mapped[list["Draft"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    shares: Mapped[list["Share"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
