"""OAuth authentication endpoints (GitHub & Google)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, require_user
from app.models.user import User

router = APIRouter()


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class GitHubCallbackRequest(BaseModel):
    """GitHub OAuth callback — exchange code for token."""
    code: str


class UserResponse(BaseModel):
    """Current user info."""
    id: int
    name: str
    email: str | None
    avatar_url: str | None

    model_config = {"from_attributes": True}


@router.post("/auth/github", response_model=TokenResponse)
async def github_login(body: GitHubCallbackRequest, db: AsyncSession = Depends(get_db)):
    """Exchange GitHub OAuth code for a platform JWT.

    Full implementation requires calling GitHub API to exchange
    the code for an access token, then fetching user info.
    This is a skeleton — fill in the httpx calls.
    """
    import httpx

    # Step 1: Exchange code for GitHub access token
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": body.code,
            },
            headers={"Accept": "application/json"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed")
        token_data = resp.json()
        gh_token = token_data.get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="No access_token from GitHub")

        # Step 2: Fetch user info
        resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_token}"},
        )
        gh_user = resp.json()

    github_id = str(gh_user["id"])
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=github_id,
            name=gh_user.get("login", "unknown"),
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user)):
    """Return current authenticated user info."""
    return UserResponse.model_validate(user)
