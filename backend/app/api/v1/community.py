"""Community endpoints — Ratings, Comments, Recommendations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_user
from app.models.convention import Convention
from app.models.rating import Comment, Rating
from app.models.user import User

router = APIRouter()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class RatingRequest(BaseModel):
    """Create or update a rating."""
    score: int = Field(..., ge=1, le=5, description="Star rating 1-5")


class RatingResponse(BaseModel):
    id: int
    convention_id: int
    user_id: int
    score: int
    created_at: str

    model_config = {"from_attributes": True}


class RatingStats(BaseModel):
    """Aggregated rating statistics for a convention."""
    convention_id: int
    average: float
    count: int
    user_rating: int | None = None  # current user's rating, if any


class CommentRequest(BaseModel):
    """Create a new comment."""
    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    id: int
    convention_id: int
    user_id: int
    author_name: str
    content: str
    created_at: str

    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    total: int
    page: int
    page_size: int


class RecommendationItem(BaseModel):
    id: int
    name: str
    namespace: str
    version: str
    description: str | None
    tags: str | None
    downloads: int
    avg_rating: float | None
    author_name: str


class RecommendationResponse(BaseModel):
    items: list[RecommendationItem]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Rating endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post(
    "/conventions/{convention_id}/ratings",
    response_model=RatingResponse,
)
async def upsert_rating(
    convention_id: int,
    body: RatingRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the current user's rating for a convention.

    Upsert semantics: if the user has already rated, the score is updated.
    """
    # Verify convention exists
    conv = await db.get(Convention, convention_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")

    # Check existing rating
    result = await db.execute(
        select(Rating).where(
            Rating.convention_id == convention_id,
            Rating.user_id == user.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.score = body.score
        await db.commit()
        await db.refresh(existing)
        return RatingResponse(
            id=existing.id,
            convention_id=existing.convention_id,
            user_id=existing.user_id,
            score=existing.score,
            created_at=existing.created_at.isoformat(),
        )

    rating = Rating(
        convention_id=convention_id,
        user_id=user.id,
        score=body.score,
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return RatingResponse(
        id=rating.id,
        convention_id=rating.convention_id,
        user_id=rating.user_id,
        score=rating.score,
        created_at=rating.created_at.isoformat(),
    )


@router.get(
    "/conventions/{convention_id}/ratings",
    response_model=RatingStats,
)
async def get_rating_stats(
    convention_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated rating statistics for a convention."""
    # Verify convention exists
    conv = await db.get(Convention, convention_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")

    result = await db.execute(
        select(
            func.avg(Rating.score).label("average"),
            func.count(Rating.id).label("count"),
        ).where(Rating.convention_id == convention_id)
    )
    row = result.one()
    avg = float(row.average) if row.average is not None else 0.0
    count = row.count

    # Get current user's rating if logged in
    user_rating: int | None = None
    if user:
        ur_result = await db.execute(
            select(Rating.score).where(
                Rating.convention_id == convention_id,
                Rating.user_id == user.id,
            )
        )
        ur = ur_result.scalar_one_or_none()
        if ur is not None:
            user_rating = ur

    return RatingStats(
        convention_id=convention_id,
        average=round(avg, 2),
        count=count,
        user_rating=user_rating,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Comment endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post(
    "/conventions/{convention_id}/comments",
    response_model=CommentResponse,
    status_code=201,
)
async def create_comment(
    convention_id: int,
    body: CommentRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a comment on a convention."""
    conv = await db.get(Convention, convention_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")

    comment = Comment(
        convention_id=convention_id,
        user_id=user.id,
        content=body.content,
        author_name=user.name,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentResponse(
        id=comment.id,
        convention_id=comment.convention_id,
        user_id=comment.user_id,
        author_name=comment.author_name,
        content=comment.content,
        created_at=comment.created_at.isoformat(),
    )


@router.get(
    "/conventions/{convention_id}/comments",
    response_model=CommentListResponse,
)
async def list_comments(
    convention_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List comments for a convention with pagination (newest first)."""
    conv = await db.get(Convention, convention_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Convention not found")

    # Count
    count_result = await db.execute(
        select(func.count(Comment.id)).where(
            Comment.convention_id == convention_id
        )
    )
    total = count_result.scalar_one()

    # Paginated list
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Comment)
        .where(Comment.convention_id == convention_id)
        .order_by(Comment.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    comments = result.scalars().all()

    return CommentListResponse(
        items=[
            CommentResponse(
                id=c.id,
                convention_id=c.convention_id,
                user_id=c.user_id,
                author_name=c.author_name,
                content=c.content,
                created_at=c.created_at.isoformat(),
            )
            for c in comments
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Recommendations endpoint
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get convention recommendations.

    If the user is logged in, recommends conventions based on:
    - Tags similar to user's published conventions
    - Popular conventions the user hasn't rated yet

    If not logged in, returns the most popular conventions.
    """
    if user:
        # Get user's published convention tags & namespaces
        user_conv_result = await db.execute(
            select(Convention.tags, Convention.namespace).where(
                Convention.author_id == user.id
            )
        )
        user_convs = user_conv_result.all()

        # Collect tags the user is interested in
        user_tags: set[str] = set()
        user_namespaces: set[str] = set()
        for row in user_convs:
            if row.tags:
                for t in row.tags.split(","):
                    t = t.strip()
                    if t:
                        user_tags.add(t)
            user_namespaces.add(row.namespace)

        # Also include conventions the user has rated
        rated_result = await db.execute(
            select(Rating.convention_id).where(Rating.user_id == user.id)
        )
        rated_ids = {r for (r,) in rated_result.all()}

        # Get user's rated conventions' tags too
        if rated_ids:
            rated_conv_result = await db.execute(
                select(Convention.tags).where(Convention.id.in_(rated_ids))
            )
            for (tags_str,) in rated_conv_result.all():
                if tags_str:
                    for t in tags_str.split(","):
                        t = t.strip()
                        if t:
                            user_tags.add(t)

        # Find conventions that:
        # 1. Not authored by user
        # 2. Not already rated by user
        # 3. Share tags with user's interests OR are popular
        query = (
            select(
                Convention,
                func.avg(Rating.score).label("avg_rating"),
            )
            .outerjoin(Rating, Rating.convention_id == Convention.id)
            .where(Convention.author_id != user.id)
            .group_by(Convention.id)
            .order_by(func.count(Rating.id).desc(), Convention.downloads.desc())
            .limit(limit)
        )

        # Exclude already-rated conventions
        if rated_ids:
            query = query.where(Convention.id.notin_(rated_ids))

        result = await db.execute(query)
    else:
        # Anonymous: return most popular conventions
        result = await db.execute(
            select(
                Convention,
                func.avg(Rating.score).label("avg_rating"),
            )
            .outerjoin(Rating, Rating.convention_id == Convention.id)
            .group_by(Convention.id)
            .order_by(Convention.downloads.desc())
            .limit(limit)
        )

    rows = result.all()
    items = []
    for conv, avg_rating in rows:
        items.append(
            RecommendationItem(
                id=conv.id,
                name=conv.name,
                namespace=conv.namespace,
                version=conv.version,
                description=conv.description,
                tags=conv.tags,
                downloads=conv.downloads,
                avg_rating=round(float(avg_rating), 2) if avg_rating else None,
                author_name=conv.author.name if conv.author else "unknown",
            )
        )

    return RecommendationResponse(items=items)
