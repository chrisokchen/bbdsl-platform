"""Tests for the export API endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_export_unsupported_format(client):
    """Unsupported format should return 400."""
    resp = await client.post(
        "/api/v1/export/pdf",
        json={"yaml_content": "system: {}"},
    )
    assert resp.status_code == 400
