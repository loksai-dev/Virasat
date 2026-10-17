import pytest
from httpx import AsyncClient

from app.config import get_settings


@pytest.mark.asyncio
async def test_auth_rejects_missing_token(async_client: AsyncClient):
    """Protected endpoint must reject requests without Authorization header."""
    response = await async_client.get("/api/cases/VR-2026-0142/overview")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "unauthorized"
    assert "request_id" in data["error"]
    assert data["error"]["request_id"] != ""


@pytest.mark.asyncio
async def test_auth_rejects_malformed_header(async_client: AsyncClient):
    """Protected endpoint must reject requests with malformed Authorization header."""
    headers = {"Authorization": "Basic invalid-credentials"}
    response = await async_client.get("/api/cases/VR-2026-0142/overview", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "unauthorized"

    headers_only_bearer = {"Authorization": "Bearer"}
    response2 = await async_client.get("/api/cases/VR-2026-0142/overview", headers=headers_only_bearer)
    assert response2.status_code == 401
    data2 = response2.json()
    assert data2["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_auth_rejects_invalid_token(async_client: AsyncClient, monkeypatch):
    """Protected endpoint must reject invalid or expired Firebase token."""
    settings = get_settings()
    monkeypatch.setattr(settings, "LOCAL_DEV_UID", "")

    headers = {"Authorization": "Bearer completely-fake-invalid-token"}
    response = await async_client.get("/api/cases/VR-2026-0142/overview", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_auth_local_dev_uid_bypass(async_client: AsyncClient, monkeypatch):
    """When DEMO_MODE is true and LOCAL_DEV_UID is set, Bearer matches bypass and allows access."""
    settings = get_settings()
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr(settings, "LOCAL_DEV_UID", "test-dev-user-999")

    headers = {"Authorization": "Bearer test-dev-user-999"}
    response = await async_client.get("/api/cases/VR-2026-0142/overview", headers=headers)
    # Auth should succeed and not return 401 Unauthorized
    assert response.status_code != 401
    assert response.status_code in (200, 403, 404)

