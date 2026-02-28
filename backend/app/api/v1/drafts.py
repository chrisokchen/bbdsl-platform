"""Draft API — save and manage unpublished YAML drafts (5.2.3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_user
from app.models.draft import Draft
from app.models.user import User

router = APIRouter()


# ────────────────────── Schemas ──────────────────────


class DraftCreate(BaseModel):
    """Request body for creating / saving a draft."""

    title: str = "Untitled"
    yaml_content: str


class DraftUpdate(BaseModel):
    """Request body for updating a draft."""

    title: str | None = None
    yaml_content: str | None = None


class DraftResponse(BaseModel):
    """Draft data returned to the client."""

    id: int
    title: str
    yaml_content: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class DraftListResponse(BaseModel):
    """Paginated list of drafts."""

    items: list[DraftResponse]
    total: int
    page: int
    page_size: int


# ────────────────────── Endpoints ──────────────────────


@router.post(
    "/drafts",
    response_model=DraftResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_draft(
    body: DraftCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a new draft (authenticated users only)."""
    draft = Draft(
        title=body.title,
        yaml_content=body.yaml_content,
        user_id=user.id,
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return _to_response(draft)


@router.get("/drafts", response_model=DraftListResponse)
async def list_drafts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's drafts (newest first)."""
    stmt = select(Draft).where(Draft.user_id == user.id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Draft.updated_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return DraftListResponse(
        items=[_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single draft by ID (owner only)."""
    draft = await _get_draft_or_404(db, draft_id, user.id)
    return _to_response(draft)


@router.put("/drafts/{draft_id}", response_model=DraftResponse)
async def update_draft(
    draft_id: int,
    body: DraftUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing draft (owner only)."""
    draft = await _get_draft_or_404(db, draft_id, user.id)

    if body.title is not None:
        draft.title = body.title
    if body.yaml_content is not None:
        draft.yaml_content = body.yaml_content

    await db.commit()
    await db.refresh(draft)
    return _to_response(draft)


@router.delete(
    "/drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_draft(
    draft_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a draft (owner only)."""
    draft = await _get_draft_or_404(db, draft_id, user.id)
    await db.delete(draft)
    await db.commit()


# ────────────────────── Helpers ──────────────────────


async def _get_draft_or_404(
    db: AsyncSession, draft_id: int, user_id: int
) -> Draft:
    result = await db.execute(
        select(Draft).where(Draft.id == draft_id, Draft.user_id == user_id)
    )
    draft = result.scalar_one_or_none()
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


def _to_response(draft: Draft) -> DraftResponse:
    return DraftResponse(
        id=draft.id,
        title=draft.title,
        yaml_content=draft.yaml_content,
        created_at=draft.created_at.isoformat(),
        updated_at=draft.updated_at.isoformat(),
    )
