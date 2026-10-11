
from fastapi import APIRouter

from app.db.repositories import PersonRepo
from app.deps import CurrentUser
from app.errors import NotImplementedException
from app.models.schemas import Overview
from app.services.case_service import check_case_access

router = APIRouter(tags=["Cases"])


@router.get("/cases/{id}")
async def get_case(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve details for a specific case."""
    case = check_case_access(id, uid, for_mutation=False)
    deceased_name = ""
    if case.get("deceased_person_id"):
        dec = PersonRepo.get(case["deceased_person_id"])
        if dec:
            deceased_name = dec.get("full_name", "")

    return {
        "id": case["case_id"],
        "case_id": case["case_id"],
        "owner_uid": case["owner_uid"],
        "deceased_name": deceased_name,
        "data_version": case.get("data_version", 1),
        "status": case.get("status", "in_progress"),
        "title": case.get("title", ""),
        "mode": case.get("mode", "prefilled"),
        "seed_key": case.get("seed_key"),
        "synthetic": True,
    }


from app.services.overview import get_case_overview as fetch_case_overview


@router.get("/cases/{id}/overview", response_model=Overview)
async def get_case_overview(
    id: str,
    uid: str = CurrentUser,
):
    """Retrieve full dashboard overview for an estate settlement case."""
    return fetch_case_overview(case_id=id, uid=uid)
