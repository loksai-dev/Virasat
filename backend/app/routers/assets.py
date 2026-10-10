
from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import (
    AssetCreateRequest,
    AssetResponse,
    AssetUpdateRequest,
    NomineesUpdateRequest,
)

router = APIRouter(tags=["Assets"])


@router.get("/cases/{id}/assets", response_model=list[AssetResponse])
async def list_assets(
    id: str,
    uid: str = CurrentUser,
):
    """List all assets for a case."""
    raise NotImplementedException()


@router.post("/cases/{id}/assets", response_model=AssetResponse, status_code=201)
async def create_asset(
    id: str,
    body: AssetCreateRequest,
    uid: str = CurrentUser,
):
    """Add an asset to a case."""
    raise NotImplementedException()


@router.get("/assets/{aid}", response_model=AssetResponse)
async def get_asset(
    aid: str,
    uid: str = CurrentUser,
):
    """Get details of a specific asset."""
    raise NotImplementedException()


@router.patch("/assets/{aid}", response_model=AssetResponse)
async def update_asset(
    aid: str,
    body: AssetUpdateRequest,
    uid: str = CurrentUser,
):
    """Update details of a specific asset."""
    raise NotImplementedException()


@router.delete("/assets/{aid}")
async def delete_asset(
    aid: str,
    uid: str = CurrentUser,
):
    """Delete an asset."""
    raise NotImplementedException()


@router.put("/assets/{aid}/nominees", response_model=AssetResponse)
async def update_nominees(
    aid: str,
    body: NomineesUpdateRequest,
    uid: str = CurrentUser,
):
    """Update nominees for an asset."""
    raise NotImplementedException()
