"""Assets routes for estate asset and bi-temporal nominee management."""

from typing import Any

from fastapi import APIRouter, Body, Header

from app.deps import CurrentUser
from app.services.case_service import (
    create_asset,
    delete_asset,
    get_asset,
    list_assets,
    update_asset,
    update_nominees,
)

router = APIRouter(tags=["Assets"])


@router.get("/cases/{id}/assets")
async def list_case_assets(
    id: str,
    uid: str = CurrentUser,
) -> list[dict[str, Any]]:
    """List all assets for a case with current active nominees."""
    return list_assets(case_id=id, uid=uid)


@router.post("/cases/{id}/assets", status_code=201)
async def add_asset_to_case(
    id: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Add an asset to an estate settlement case."""
    return create_asset(case_id=id, data=body, uid=uid, if_match=if_match)


@router.get("/assets/{aid}")
async def get_single_asset(
    aid: str,
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Get details of a specific asset."""
    return get_asset(asset_id=aid, uid=uid)


@router.patch("/assets/{aid}")
async def update_asset_details(
    aid: str,
    body: dict[str, Any] = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Update details of a specific asset."""
    return update_asset(asset_id=aid, updates=body, uid=uid, if_match=if_match)


@router.delete("/assets/{aid}")
async def delete_asset_from_case(
    aid: str,
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Soft delete an asset and close all associated nominee and ownership edges."""
    return delete_asset(asset_id=aid, uid=uid, if_match=if_match)


@router.put("/assets/{aid}/nominees")
async def update_asset_nominees(
    aid: str,
    body: Any = Body(...),
    if_match: str | None = Header(None, alias="If-Match"),
    uid: str = CurrentUser,
) -> dict[str, Any]:
    """Atomically replace the full list of nominees for an asset, superseding previous edges."""
    if isinstance(body, dict):
        nominees_list = body.get("nominees", [])
    elif isinstance(body, list):
        nominees_list = body
    else:
        nominees_list = []

    return update_nominees(asset_id=aid, nominees_list=nominees_list, uid=uid, if_match=if_match)
