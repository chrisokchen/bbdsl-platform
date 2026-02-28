"""Registry business logic — search, versioning, namespace management."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.convention import Convention


async def get_latest_version(
    db: AsyncSession, namespace: str
) -> Convention | None:
    """Get the latest version of a convention by namespace."""
    result = await db.execute(
        select(Convention)
        .where(Convention.namespace == namespace)
        .order_by(Convention.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def increment_downloads(db: AsyncSession, conv_id: int) -> None:
    """Increment the download counter for a convention."""
    result = await db.execute(
        select(Convention).where(Convention.id == conv_id)
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.downloads += 1
        await db.commit()
