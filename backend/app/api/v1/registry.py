"""Convention Registry API — CRUD, search, versioning, namespaces."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_user
from app.models.convention import Convention
from app.models.namespace import Namespace
from app.models.user import User
from app.services.bbdsl_service import validate_yaml
from app.services.registry_service import increment_downloads

router = APIRouter()


# ────────────────────── Schemas ──────────────────────


class ConventionCreate(BaseModel):
    """Request body for uploading a new convention."""

    name: str
    namespace: str
    version: str = "1.0.0"
    description: str | None = None
    tags: str | None = None
    yaml_content: str


class ConventionUpdate(BaseModel):
    """Request body for updating a convention (partial)."""

    name: str | None = None
    description: str | None = None
    tags: str | None = None
    yaml_content: str | None = None


class ConventionResponse(BaseModel):
    """Convention data returned to the client."""

    id: int
    name: str
    namespace: str
    version: str
    description: str | None
    tags: str | None
    yaml_content: str | None = None
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


class VersionInfo(BaseModel):
    """Minimal version metadata."""

    version: str
    created_at: str
    downloads: int


class NamespaceCreate(BaseModel):
    """Request body for claiming a new namespace."""

    prefix: str = Field(
        ...,
        min_length=2,
        max_length=128,
        pattern=r"^[a-z][a-z0-9_-]*$",
        description="Lowercase alphanumeric namespace prefix (e.g. 'precision', 'sayc')",
    )
    display_name: str | None = None
    description: str | None = None


class NamespaceResponse(BaseModel):
    """Namespace data returned to the client."""

    id: int
    prefix: str
    display_name: str | None
    description: str | None
    owner_name: str
    created_at: str

    model_config = {"from_attributes": True}


class NamespaceListResponse(BaseModel):
    """Paginated list of namespaces."""

    items: list[NamespaceResponse]
    total: int
    page: int
    page_size: int


# ────────────────────── Convention CRUD (5.1.2) ──────────────────────


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
    """Upload a new convention. YAML is validated automatically (5.1.3)."""

    # ── 5.1.3: auto-validate on upload ──
    report = validate_yaml(body.yaml_content)
    if report.get("error_count", 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "YAML validation failed",
                "report": report,
            },
        )

    # ── 5.1.5: namespace + version uniqueness ──
    existing = await db.execute(
        select(Convention).where(
            Convention.namespace == body.namespace,
            Convention.version == body.version,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Convention '{body.namespace}' version '{body.version}' already exists.",
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
    q: str | None = Query(None, description="Search by name or namespace"),
    tag: str | None = Query(None, description="Filter by tag"),
    namespace: str | None = Query(None, description="Filter by exact namespace"),
    author: str | None = Query(None, description="Filter by author name"),
    sort: str = Query("newest", description="Sort: newest | oldest | downloads | name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search and list conventions with pagination (5.1.4)."""
    stmt = select(Convention).join(Convention.author)

    # ── Filters ──
    if q:
        like_q = f"%{q}%"
        stmt = stmt.where(
            Convention.name.ilike(like_q) | Convention.namespace.ilike(like_q)
        )
    if tag:
        stmt = stmt.where(Convention.tags.ilike(f"%{tag}%"))
    if namespace:
        stmt = stmt.where(Convention.namespace == namespace)
    if author:
        stmt = stmt.where(User.name.ilike(f"%{author}%"))

    # ── Sorting ──
    order_map = {
        "newest": Convention.created_at.desc(),
        "oldest": Convention.created_at.asc(),
        "downloads": Convention.downloads.desc(),
        "name": Convention.name.asc(),
    }
    stmt = stmt.order_by(order_map.get(sort, Convention.created_at.desc()))

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
    conv = await _get_convention_or_404(db, conv_id)
    return _to_response(conv, include_yaml=True)


@router.put("/conventions/{conv_id}", response_model=ConventionResponse)
async def update_convention(
    conv_id: int,
    body: ConventionUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing convention (owner only)."""
    conv = await _get_convention_or_404(db, conv_id)

    if conv.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can update this convention.",
        )

    # If YAML content is being updated, re-validate
    if body.yaml_content is not None:
        report = validate_yaml(body.yaml_content)
        if report.get("error_count", 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "YAML validation failed", "report": report},
            )
        conv.yaml_content = body.yaml_content

    if body.name is not None:
        conv.name = body.name
    if body.description is not None:
        conv.description = body.description
    if body.tags is not None:
        conv.tags = body.tags

    await db.commit()
    await db.refresh(conv)
    return _to_response(conv)


@router.delete(
    "/conventions/{conv_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_convention(
    conv_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a convention (owner only)."""
    conv = await _get_convention_or_404(db, conv_id)

    if conv.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can delete this convention.",
        )

    await db.delete(conv)
    await db.commit()


@router.post(
    "/conventions/{conv_id}/download",
    response_model=ConventionResponse,
)
async def download_convention(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Record a download and return the convention (increments counter)."""
    conv = await _get_convention_or_404(db, conv_id)
    await increment_downloads(db, conv_id)
    await db.refresh(conv)
    return _to_response(conv)


# ────────────────────── Version Management (5.1.5) ──────────────────────


@router.get(
    "/conventions/ns/{namespace}/{version}",
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
    return _to_response(conv, include_yaml=True)


@router.get(
    "/conventions/ns/{namespace}/versions",
    response_model=list[VersionInfo],
)
async def list_versions(
    namespace: str,
    db: AsyncSession = Depends(get_db),
):
    """List all versions of a convention namespace, newest first (5.1.5)."""
    result = await db.execute(
        select(Convention)
        .where(Convention.namespace == namespace)
        .order_by(Convention.created_at.desc())
    )
    items = result.scalars().all()
    if not items:
        raise HTTPException(
            status_code=404,
            detail=f"No conventions found for namespace '{namespace}'",
        )
    return [
        VersionInfo(
            version=c.version,
            created_at=c.created_at.isoformat(),
            downloads=c.downloads,
        )
        for c in items
    ]


# ────────────────────── Namespace API (5.1.6) ──────────────────────


@router.post(
    "/namespaces",
    response_model=NamespaceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_namespace(
    body: NamespaceCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Claim a new namespace (authenticated users only)."""
    # Check if prefix is already taken
    existing = await db.execute(
        select(Namespace).where(Namespace.prefix == body.prefix)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Namespace '{body.prefix}' is already claimed.",
        )

    ns = Namespace(
        prefix=body.prefix,
        display_name=body.display_name,
        description=body.description,
        owner_id=user.id,
    )
    db.add(ns)
    await db.commit()
    await db.refresh(ns)

    return _to_ns_response(ns)


@router.get("/namespaces", response_model=NamespaceListResponse)
async def list_namespaces(
    q: str | None = Query(None, description="Search by prefix or display name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List / search namespaces."""
    stmt = select(Namespace)
    if q:
        like_q = f"%{q}%"
        stmt = stmt.where(
            Namespace.prefix.ilike(like_q) | Namespace.display_name.ilike(like_q)
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Namespace.prefix.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return NamespaceListResponse(
        items=[_to_ns_response(ns) for ns in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/namespaces/{prefix}", response_model=NamespaceResponse)
async def get_namespace(
    prefix: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a namespace by its prefix."""
    result = await db.execute(
        select(Namespace).where(Namespace.prefix == prefix)
    )
    ns = result.scalar_one_or_none()
    if ns is None:
        raise HTTPException(status_code=404, detail="Namespace not found")
    return _to_ns_response(ns)


# ────────────────────── Helpers ──────────────────────


async def _get_convention_or_404(
    db: AsyncSession, conv_id: int
) -> Convention:
    result = await db.execute(
        select(Convention).where(Convention.id == conv_id)
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")
    return conv


def _to_response(conv: Convention, include_yaml: bool = False) -> ConventionResponse:
    return ConventionResponse(
        id=conv.id,
        name=conv.name,
        namespace=conv.namespace,
        version=conv.version,
        description=conv.description,
        tags=conv.tags,
        yaml_content=conv.yaml_content if include_yaml else None,
        downloads=conv.downloads,
        author_name=conv.author.name if conv.author else "Unknown",
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


def _to_ns_response(ns: Namespace) -> NamespaceResponse:
    return NamespaceResponse(
        id=ns.id,
        prefix=ns.prefix,
        display_name=ns.display_name,
        description=ns.description,
        owner_name=ns.owner.name if ns.owner else "Unknown",
        created_at=ns.created_at.isoformat(),
    )
