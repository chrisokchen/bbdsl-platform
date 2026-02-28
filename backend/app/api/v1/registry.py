"""Convention Registry API — CRUD, search, versioning."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_user
from app.models.convention import Convention
from app.models.user import User
from app.services.bbdsl_service import validate_yaml

router = APIRouter()


# ---------- Schemas ----------


class ConventionCreate(BaseModel):
    """Request body for uploading a new convention."""
    name: str
    namespace: str
    version: str = "1.0.0"
    description: str | None = None
    tags: str | None = None
    yaml_content: str


class ConventionResponse(BaseModel):
    """Convention data returned to the client."""
    id: int
    name: str
    namespace: str
    version: str
    description: str | None
    tags: str | None
    downloads: int
    author_name: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ConventionListResponse(BaseModel):
    """Paginated list of conventions."""
    items: list[ConventionResponse]
    total: int
    page: int
    page_size: int


# ---------- Endpoints ----------


@router.post(
    "/conventions",
    response_model=ConventionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_convention(
    body: ConventionCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a new convention. YAML is validated automatically."""
    # Validate YAML via bbdsl
    report = validate_yaml(body.yaml_content)
    if report.get("error_count", 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "YAML validation failed",
                "report": report,
            },
        )

    conv = Convention(
        name=body.name,
        namespace=body.namespace,
        version=body.version,
        description=body.description,
        tags=body.tags,
        yaml_content=body.yaml_content,
        author_id=user.id,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return _to_response(conv)


@router.get("/conventions", response_model=ConventionListResponse)
async def list_conventions(
    q: str | None = Query(None, description="Search by name/namespace"),
    tag: str | None = Query(None, description="Filter by tag"),
    author: str | None = Query(None, description="Filter by author name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search and list conventions with pagination."""
    stmt = select(Convention)

    if q:
        like_q = f"%{q}%"
        stmt = stmt.where(
            Convention.name.ilike(like_q)
            | Convention.namespace.ilike(like_q)
        )
    if tag:
        stmt = stmt.where(Convention.tags.ilike(f"%{tag}%"))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginate
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return ConventionListResponse(
        items=[_to_response(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conventions/{conv_id}", response_model=ConventionResponse)
async def get_convention(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single convention by ID."""
    result = await db.execute(
        select(Convention).where(Convention.id == conv_id)
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")
    return _to_response(conv)


@router.get(
    "/conventions/{namespace}/{version}",
    response_model=ConventionResponse,
)
async def get_convention_by_ns_version(
    namespace: str,
    version: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a convention by namespace + version."""
    result = await db.execute(
        select(Convention).where(
            Convention.namespace == namespace,
            Convention.version == version,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")
    return _to_response(conv)


# ---------- Helpers ----------


def _to_response(conv: Convention) -> ConventionResponse:
    return ConventionResponse(
        id=conv.id,
        name=conv.name,
        namespace=conv.namespace,
        version=conv.version,
        description=conv.description,
        tags=conv.tags,
        downloads=conv.downloads,
        author_name=conv.author.name if conv.author else "Unknown",
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )
