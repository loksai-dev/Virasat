import pytest
from httpx import AsyncClient

from app.config import get_settings


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient):
    """Verify /health returns 200 with status 'ok' and version metadata."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "x-request-id" in response.headers or "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_ready_endpoint(async_client: AsyncClient):
    """Verify /ready verifies Spanner and Vertex AI connectivity and returns configured models."""
    response = await async_client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["spanner"] == "ok"
    assert data["vertex"] == "ok"

    settings = get_settings()
    assert data["models"]["pro"] == settings.GEMINI_PRO_MODEL
    assert data["models"]["flash"] == settings.GEMINI_FLASH_MODEL
    assert data["models"]["embed"] == settings.EMBED_MODEL
    assert data["models"]["embed_dim"] == settings.EMBED_DIM
