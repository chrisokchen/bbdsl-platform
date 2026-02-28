"""Share ORM model — permanent links to shared YAML content."""

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _generate_hash() -> str:
    """Generate a short unique hash for share URLs."""
    random_bytes = secrets.token_bytes(16)
    return hashlib.sha256(random_bytes).hexdigest()[:12]


class Share(Base):
    """A permanently shared BBDSL YAML snippet with a hash-based URL."""

    __tablename__ = "shares"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hash: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=_generate_hash
    )
    title: Mapped[str] = mapped_column(String(256), default="Shared Convention")
    yaml_content: Mapped[str] = mapped_column(Text)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User | None"] = relationship(
        back_populates="shares", lazy="selectin"
    )
