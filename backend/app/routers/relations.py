from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import (
    RelationshipCreateRequest,
    RelationshipResponse,
    RelationshipUpdateRequest,
)

router = APIRouter(tags=["Relations"])


@router.post("/cases/{id}/relationships", response_model=RelationshipResponse, status_code=201)
async def create_relationship(
    id: str,
    body: RelationshipCreateRequest,
    uid: str = CurrentUser,
):
    """Create a bi-temporal relationship between two individuals."""
    raise NotImplementedException()


@router.patch("/relationships/{rid}", response_model=RelationshipResponse)
async def update_relationship(
    rid: str,
    body: RelationshipUpdateRequest,
    uid: str = CurrentUser,
):
    """Update a bi-temporal relationship."""
    raise NotImplementedException()


@router.delete("/relationships/{rid}")
async def delete_relationship(
    rid: str,
    uid: str = CurrentUser,
):
    """Close/delete a bi-temporal relationship."""
    raise NotImplementedException()
