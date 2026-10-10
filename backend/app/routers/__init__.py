from fastapi import APIRouter

from app.routers import (
    admin,
    assets,
    audit,
    cases,
    chat,
    claims,
    consent,
    disputes,
    documents,
    graph,
    history,
    impact,
    institution,
    people,
    relations,
    runs,
    sessions,
    shares,
    whatif,
    will,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(sessions.router)
api_router.include_router(cases.router)
api_router.include_router(people.router)
api_router.include_router(relations.router)
api_router.include_router(assets.router)
api_router.include_router(will.router)
api_router.include_router(documents.router)
api_router.include_router(graph.router)
api_router.include_router(shares.router)
api_router.include_router(history.router)
api_router.include_router(runs.router)
api_router.include_router(whatif.router)
api_router.include_router(claims.router)
api_router.include_router(disputes.router)
api_router.include_router(chat.router)
api_router.include_router(audit.router)
api_router.include_router(consent.router)
api_router.include_router(institution.router)
api_router.include_router(impact.router)
api_router.include_router(admin.router)

__all__ = ["api_router"]
