"""Convention ORM model for the Registry."""

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


class Convention(Base):
    """A BBDSL convention stored in the Registry."""

    __tablename__ = "conventions"
    __table_args__ = (
        UniqueConstraint("namespace", "version", name="uq_namespace_version"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    namespace: Mapped[str] = mapped_column(String(256), index=True)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(
        String(512), nullable=True
    )  # comma-separated
    yaml_content: Mapped[str] = mapped_column(Text)
    downloads: Mapped[int] = mapped_column(Integer, default=0)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    author: Mapped["User"] = relationship(  # noqa: F821
        back_populates="conventions", lazy="selectin"
    )
    ratings: Mapped[list["Rating"]] = relationship(  # noqa: F821
        back_populates="convention", lazy="selectin"
    )
    comments: Mapped[list["Comment"]] = relationship(  # noqa: F821
        back_populates="convention", lazy="selectin"
    )
