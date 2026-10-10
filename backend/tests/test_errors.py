import pytest
from fastapi import APIRouter
from httpx import AsyncClient

from app.errors import (
    Conflict,
    Forbidden,
    NotFound,
    RateLimited,
    ValidationFailed,
)
from app.main import app

# Add a test-only router to trigger each exception specifically
test_router = APIRouter(prefix="/test-errors", tags=["Test"])


@test_router.get("/not-found")
async def trigger_not_found():
    raise NotFound("Estate case not found")


@test_router.get("/forbidden")
async def trigger_forbidden():
    raise Forbidden("Cannot mutate SEED template case")


@test_router.get("/conflict")
async def trigger_conflict():
    raise Conflict("Case data_version has been incremented concurrently")


@test_router.get("/validation-failed")
async def trigger_validation_failed():
    raise ValidationFailed("Nominee share percentage exceeds 100")


@test_router.get("/rate-limited")
async def trigger_rate_limited():
    raise RateLimited("Too many requests from client IP")


@test_router.get("/unhandled")
async def trigger_unhandled():
    raise RuntimeError("Simulated internal catastrophic error")


# Register test router once for error tests
if not any(getattr(r, "path", None) == "/test-errors/not-found" for r in app.routes):
    app.include_router(test_router)



@pytest.mark.asyncio
async def test_not_found_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/not-found")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "not_found"
    assert data["error"]["message"] == "Estate case not found"
    assert "request_id" in data["error"]
    assert len(data["error"]["request_id"]) > 0


@pytest.mark.asyncio
async def test_forbidden_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/forbidden")
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "forbidden"
    assert data["error"]["message"] == "Cannot mutate SEED template case"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_conflict_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/conflict")
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "conflict"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_validation_failed_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/validation-failed")
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "validation_failed"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_rate_limited_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/rate-limited")
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "rate_limited"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_pydantic_validation_error_envelope(async_client: AsyncClient, monkeypatch):
    """Calling an endpoint with invalid body returns 422 in standard error envelope."""
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr(settings, "LOCAL_DEV_UID", "test-user")

    # Invalid scenario ("invalid_scenario" not in "sharma"|"mehta")
    payload = {"role": "claimant", "scenario": "invalid_scenario"}
    headers = {"Authorization": "Bearer test-user"}
    response = await async_client.post("/api/demo/session", json=payload, headers=headers)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "validation_failed"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_unhandled_error_envelope(async_client: AsyncClient):
    response = await async_client.get("/test-errors/unhandled")
    assert response.status_code == 500
    data = response.json()
    assert data["error"]["code"] == "internal_error"
    assert "request_id" in data["error"]
