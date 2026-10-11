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
root_router = APIRouter()

for r in [
    sessions.router,
    cases.router,
    people.router,
    relations.router,
    assets.router,
    will.router,
    documents.router,
    graph.router,
    shares.router,
    history.router,
    runs.router,
    whatif.router,
    claims.router,
    disputes.router,
    chat.router,
    audit.router,
    consent.router,
    institution.router,
    impact.router,
    admin.router,
]:
    api_router.include_router(r)
    root_router.include_router(r)

__all__ = ["api_router", "root_router"]

