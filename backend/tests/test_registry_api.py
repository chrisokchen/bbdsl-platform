"""Tests for the Convention Registry API endpoints (Sprint 5.1.1-5.1.6)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import async_session, create_tables, engine, Base
from app.core.security import create_access_token
from app.main import app
from app.models.user import User


# ────────────────────── Fixtures ──────────────────────


@pytest.fixture(autouse=True)
async def _reset_db():
    """Re-create all tables before each test for isolation."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def test_user() -> User:
    """Create and return a test user in the database."""
    async with async_session() as db:
        user = User(name="testuser", github_id="gh-12345", email="test@example.com")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    """Return Authorization headers with a valid JWT for *test_user*."""
    token = create_access_token({"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}


SAMPLE_YAML = """\
bbdsl_version: "0.3"
system:
  name: Test System
  version: "1.0.0"
"""


# ────────────────────── Health ──────────────────────


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ────────────────────── 5.1.2  Convention CRUD ──────────────────────


@pytest.mark.asyncio
async def test_create_convention_requires_auth(client):
    """POST /conventions without token should return 401."""
    resp = await client.post(
        "/api/v1/conventions",
        json={"name": "x", "namespace": "x", "yaml_content": SAMPLE_YAML},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_conventions_empty(client):
    """Empty registry should return zero items."""
    resp = await client.get("/api/v1/conventions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


# ────────────────────── 5.1.4  Search ──────────────────────


@pytest.mark.asyncio
async def test_search_conventions_with_query(client):
    """Search should accept query/tag/author/sort parameters."""
    resp = await client.get(
        "/api/v1/conventions",
        params={"q": "precision", "sort": "downloads"},
    )
    assert resp.status_code == 200


# ────────────────────── 5.1.6  Namespace ──────────────────────


@pytest.mark.asyncio
async def test_create_namespace_requires_auth(client):
    """POST /namespaces without token should return 401."""
    resp = await client.post(
        "/api/v1/namespaces",
        json={"prefix": "myns"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_namespaces(client):
    """GET /namespaces should return paginated list."""
    resp = await client.get("/api/v1/namespaces")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
