"""Registry business logic — search, versioning, namespace management."""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.convention import Convention
from app.models.namespace import Namespace

# Simple SemVer pattern  (major.minor.patch with optional pre-release)
SEMVER_RE = re.compile(
    r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
    r"(?:-(?P<pre>[0-9A-Za-z\-]+(?:\.[0-9A-Za-z\-]+)*))?$"
)


def is_valid_semver(version: str) -> bool:
    """Return True if *version* is a valid SemVer string."""
    return SEMVER_RE.match(version) is not None


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


async def list_versions(
    db: AsyncSession, namespace: str
) -> list[Convention]:
    """Return all versions for a namespace ordered newest-first."""
    result = await db.execute(
        select(Convention)
        .where(Convention.namespace == namespace)
        .order_by(Convention.created_at.desc())
    )
    return list(result.scalars().all())


async def increment_downloads(db: AsyncSession, conv_id: int) -> None:
    """Increment the download counter for a convention."""
    result = await db.execute(
        select(Convention).where(Convention.id == conv_id)
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.downloads += 1
        await db.commit()


async def namespace_exists(db: AsyncSession, prefix: str) -> bool:
    """Return True if *prefix* is already claimed."""
    result = await db.execute(
        select(Namespace).where(Namespace.prefix == prefix)
    )
    return result.scalar_one_or_none() is not None


async def user_owns_namespace(
    db: AsyncSession, prefix: str, user_id: int
) -> bool:
    """Return True if *user_id* owns the given namespace."""
    result = await db.execute(
        select(Namespace).where(
            Namespace.prefix == prefix,
            Namespace.owner_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None
