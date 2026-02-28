"""Share API — create and retrieve permanent share links (5.2.4)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.share import Share
from app.models.user import User

router = APIRouter()


# ────────────────────── Schemas ──────────────────────


class ShareCreate(BaseModel):
    """Request body for creating a share link."""

    title: str = "Shared Convention"
    yaml_content: str


class ShareResponse(BaseModel):
    """Share data returned to the client."""

    id: int
    hash: str
    title: str
    yaml_content: str
    author_name: str | None
    views: int
    created_at: str

    model_config = {"from_attributes": True}


# ────────────────────── Endpoints ──────────────────────


@router.post(
    "/share",
    response_model=ShareResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_share(
    body: ShareCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a permanent share link for YAML content.

    Authentication is optional — anonymous shares are allowed.
    """
    share = Share(
        title=body.title,
        yaml_content=body.yaml_content,
        user_id=user.id if user else None,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return _to_response(share)


@router.get("/share/{hash}", response_model=ShareResponse)
async def get_share(
    hash: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a shared YAML by its hash. Increments view counter."""
    result = await db.execute(
        select(Share).where(Share.hash == hash)
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")

    # Increment view count
    share.views += 1
    await db.commit()
    await db.refresh(share)

    return _to_response(share)


# ────────────────────── Helpers ──────────────────────


def _to_response(share: Share) -> ShareResponse:
    return ShareResponse(
        id=share.id,
        hash=share.hash,
        title=share.title,
        yaml_content=share.yaml_content,
        author_name=share.user.name if share.user else None,
        views=share.views,
        created_at=share.created_at.isoformat(),
    )
