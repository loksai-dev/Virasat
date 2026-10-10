import pytest
from httpx import AsyncClient

EXPECTED_CONTRACT_ROUTES = [
    # HEALTH
    ("get", "/health"),
    ("get", "/ready"),
    # SESSIONS
    ("post", "/api/demo/session"),
    ("post", "/api/cases/{id}/reset"),
    # CASES
    ("get", "/api/cases/{id}"),
    ("get", "/api/cases/{id}/overview"),
    # PEOPLE
    ("get", "/api/cases/{id}/people"),
    ("post", "/api/cases/{id}/people"),
    ("patch", "/api/people/{pid}"),
    ("delete", "/api/people/{pid}"),
    # RELATIONS
    ("post", "/api/cases/{id}/relationships"),
    ("patch", "/api/relationships/{rid}"),
    ("delete", "/api/relationships/{rid}"),
    # ASSETS
    ("get", "/api/cases/{id}/assets"),
    ("post", "/api/cases/{id}/assets"),
    ("get", "/api/assets/{aid}"),
    ("patch", "/api/assets/{aid}"),
    ("delete", "/api/assets/{aid}"),
    ("put", "/api/assets/{aid}/nominees"),
    # WILL
    ("get", "/api/cases/{id}/will"),
    ("put", "/api/cases/{id}/will"),
    # DOCUMENTS
    ("get", "/api/cases/{id}/documents"),
    ("post", "/api/cases/{id}/documents"),
    ("get", "/api/documents/{did}"),
    ("patch", "/api/documents/{did}"),
    ("delete", "/api/documents/{did}"),
    # GRAPH
    ("get", "/api/cases/{id}/graph"),
    # SHARES
    ("get", "/api/cases/{id}/shares"),
    # HISTORY
    ("get", "/api/cases/{id}/history"),
    # RUNS
    ("post", "/api/cases/{id}/run"),
    ("get", "/api/runs/{rid}"),
    ("get", "/api/runs/{rid}/events"),
    ("get", "/api/cases/{id}/events"),
    # WHATIF
    ("post", "/api/cases/{id}/whatif"),
    # CLAIMS
    ("get", "/api/cases/{id}/claims"),
    ("get", "/api/claims/{cid}/packet"),
    ("post", "/api/claims/{cid}/approve"),
    ("post", "/api/claims/{cid}/advance"),
    # DISPUTES
    ("get", "/api/cases/{id}/disputes"),
    ("post", "/api/disputes/{did}/resolve"),
    # CHAT
    ("post", "/api/chat"),
    ("get", "/api/cases/{id}/chat"),
    # AUDIT
    ("get", "/api/cases/{id}/audit"),
    ("get", "/api/cases/{id}/audit/verify"),
    # CONSENT
    ("get", "/api/cases/{id}/consent"),
    ("put", "/api/cases/{id}/consent"),
    # INSTITUTION
    ("get", "/api/institution/dashboard"),
    ("get", "/api/institution/claims"),
    ("get", "/api/institution/savings"),
    # IMPACT
    ("get", "/api/impact"),
    # ADMIN
    ("post", "/api/admin/cleanup"),
]


@pytest.mark.asyncio
async def test_docs_and_openapi_accessible(async_client: AsyncClient):
    """Verify /docs HTML and /openapi.json specification are accessible."""
    docs_resp = await async_client.get("/docs")
    assert docs_resp.status_code == 200
    assert "swagger-ui" in docs_resp.text.lower() or "html" in docs_resp.headers.get("content-type", "")

    openapi_resp = await async_client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    schema = openapi_resp.json()
    assert "paths" in schema
    assert "info" in schema
    assert schema["info"]["title"] == "Virasat API"


@pytest.mark.asyncio
async def test_every_contract_route_is_registered(async_client: AsyncClient):
    """Verify that every route and method in the API contract is present in the OpenAPI schema."""
    openapi_resp = await async_client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    schema = openapi_resp.json()
    paths = schema["paths"]

    missing_routes = []
    for method, path in EXPECTED_CONTRACT_ROUTES:
        if path not in paths:
            missing_routes.append(f"{method.upper()} {path} (path missing)")
        elif method.lower() not in paths[path]:
            missing_routes.append(f"{method.upper()} {path} (method missing)")

    assert not missing_routes, f"Contract routes missing from OpenAPI schema: {missing_routes}"
