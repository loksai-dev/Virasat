import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import ensure_firebase_initialized
from app.config import Settings, get_settings
from app.deps import get_genai_client, get_spanner_database
from app.errors import AppException, register_exception_handlers
from app.logging_setup import request_id_ctx, setup_logging
from app.models.schemas import HealthResponse, ReadyModelConfig, ReadyResponse
from app.routers import api_router, root_router
from app.services.change_propagation import change_propagator
from app.services.rate_limiter import rate_limiter

from fastapi.middleware.gzip import GZipMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    logger.info("Starting Virasat FastAPI application")
    ensure_firebase_initialized()

    # Warm Spanner session pool at startup
    try:
        db = get_spanner_database()
        with db.snapshot() as snap:
            list(snap.execute_sql("SELECT 1"))
        logger.info("Spanner session pool warmed successfully at startup.")
    except Exception as e:
        logger.warning("Spanner session warm-up skipped: %s", e)

    # Initialize GenAI client at startup
    try:
        get_genai_client()
        logger.info("GenAI client pre-warmed successfully at startup.")
    except Exception as e:
        logger.warning("GenAI client init skipped: %s", e)

    yield
    logger.info("Shutting down Virasat FastAPI application")


settings = get_settings()

app = FastAPI(
    title="Virasat API",
    description="AI estate settlement and legal heir succession platform for Google Cloud JAPAC Hackathon 2026.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# --------------------------------------------------------------------------
# Cross-Origin Resource Sharing (CORS) & GZip Compression
# --------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# --------------------------------------------------------------------------
# Request ID & Audit Logging Middleware
# --------------------------------------------------------------------------
@app.middleware("http")
async def request_id_and_logging_middleware(request: Request, call_next):
    """Generate request ID, manage context var, and log structured HTTP metrics.

    CRITICAL SECURITY RULE: Never log bodies or document text.
    """
    incoming_id = request.headers.get("X-Request-ID")
    req_id = incoming_id if incoming_id else str(uuid.uuid4())

    token = request_id_ctx.set(req_id)
    request.state.request_id = req_id

    start_time = time.perf_counter()
    try:
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        response.headers["X-Request-ID"] = req_id

        # Log request completion without logging request body or document data
        logger.info(
            "%s %s - %d (took %sms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "extra_data": {
                    "http_method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            },
        )
        return response
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(
            "Unhandled server error: %s %s (took %sms) - %s",
            request.method,
            request.url.path,
            duration_ms,
            exc,
            exc_info=True,
        )
        envelope = {
            "error": {
                "code": "internal_error",
                "message": "An unexpected internal server error occurred",
                "request_id": req_id,
            }
        }
        return JSONResponse(
            status_code=500,
            content=envelope,
            headers={"X-Request-ID": req_id},
        )
    finally:
        request_id_ctx.reset(token)


# --------------------------------------------------------------------------
# Token Bucket Rate Limiting Middleware
# --------------------------------------------------------------------------
@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    """Enforce token bucket rate limiting per UID and per client IP."""
    path = request.url.path
    if path in ("/health", "/ready", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    caller_id = ""
    if auth_header.startswith("Bearer "):
        caller_id = auth_header.split(" ", 1)[1].strip()

    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.client.host if request.client else "127.0.0.1"

    identifier = caller_id if caller_id else client_ip

    method = request.method.upper()
    category = "general"
    if "/documents" in path and method == "POST":
        category = "upload"
    elif "/run" in path and method == "POST":
        category = "run"
    elif "/chat" in path and method == "POST":
        category = "chat"
    elif "/whatif" in path and method == "POST":
        category = "whatif"

    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    # Check category rate limit
    allowed, msg = rate_limiter.check_rate_limit(identifier=identifier, category=category)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "RATE_LIMITED",
                    "message": msg,
                    "request_id": req_id,
                }
            },
            headers={"Retry-After": "2", "X-Request-ID": req_id},
        )

    # Also apply general limit ceiling (e.g. 60 req/min)
    if category != "general":
        gen_allowed, gen_msg = rate_limiter.check_rate_limit(identifier=identifier, category="general")
        if not gen_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": gen_msg,
                        "request_id": req_id,
                    }
                },
                headers={"Retry-After": "2", "X-Request-ID": req_id},
            )

    return await call_next(request)


# --------------------------------------------------------------------------
# Exception Handlers
# --------------------------------------------------------------------------
register_exception_handlers(app)


# --------------------------------------------------------------------------
# Core Health and Readiness Checks (Outside /api)
# --------------------------------------------------------------------------
GIT_COMMIT = os.environ.get("GIT_COMMIT", "379d382")
VERSION = "1.0.1"


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Liveness probe: returns ok with service version and git commit hash."""
    return HealthResponse(status="ok", version=VERSION, commit=GIT_COMMIT)


@app.get("/ready", response_model=ReadyResponse, tags=["Health"])
async def readiness_check(cfg: Settings = Depends(get_settings)):
    """Readiness probe: validates Spanner SELECT 1 and Vertex AI model resolution."""
    spanner_status = "error"
    vertex_status = "error"

    # 1. Spanner connectivity check
    try:
        db = get_spanner_database(cfg)
        with db.snapshot() as snapshot:
            results = list(snapshot.execute_sql("SELECT 1"))
            if results and results[0][0] == 1:
                spanner_status = "ok"
    except Exception as e:
        logger.error("Spanner readiness check failed: %s", e)
        raise AppException(
            message=f"Spanner connectivity check failed: {e}",
            code="service_unavailable",
            status_code=503,
        ) from e

    # 2. Vertex AI connectivity check (fetches configured model metadata)
    try:
        genai_client = get_genai_client(cfg)
        genai_client.models.get(model=cfg.GEMINI_FLASH_MODEL)
        vertex_status = "ok"
    except Exception as e:
        logger.error("Vertex AI readiness check failed: %s", e)
        raise AppException(
            message=f"Vertex AI readiness check failed: {e}",
            code="service_unavailable",
            status_code=503,
        ) from e


    return ReadyResponse(
        status="ready",
        spanner=spanner_status,
        vertex=vertex_status,
        models=ReadyModelConfig(
            pro=cfg.GEMINI_PRO_MODEL,
            flash=cfg.GEMINI_FLASH_MODEL,
            embed=cfg.EMBED_MODEL,
            embed_dim=cfg.EMBED_DIM,
        ),
    )


# --------------------------------------------------------------------------
# Include All API Contract Routers under /api and root
# --------------------------------------------------------------------------
app.include_router(api_router)
app.include_router(root_router)

