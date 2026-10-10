
from fastapi import APIRouter

from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import PersonCreateRequest, PersonResponse, PersonUpdateRequest

router = APIRouter(tags=["People"])


@router.get("/cases/{id}/people", response_model=list[PersonResponse])
async def list_people(
    id: str,
    uid: str = CurrentUser,
):
    """List all people associated with a case."""
    raise NotImplementedException()


@router.post("/cases/{id}/people", response_model=PersonResponse, status_code=201)
async def create_person(
    id: str,
    body: PersonCreateRequest,
    uid: str = CurrentUser,
):
    """Add a person to a case."""
    raise NotImplementedException()


@router.patch("/people/{pid}", response_model=PersonResponse)
async def update_person(
    pid: str,
    body: PersonUpdateRequest,
    uid: str = CurrentUser,
):
    """Update details of a person."""
    raise NotImplementedException()


@router.delete("/people/{pid}")
async def delete_person(
    pid: str,
    uid: str = CurrentUser,
):
    """Delete a person from a case."""
    raise NotImplementedException()
