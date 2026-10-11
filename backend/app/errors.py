import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.logging_setup import get_current_request_id

logger = logging.getLogger(__name__)


# Pydantic schemas for the error envelope
class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


# Base application exception
class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "internal_error",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Any | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class BadRequest(AppException):
    def __init__(self, message: str = "Bad request"):
        super().__init__(
            message=message,
            code="bad_request",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class NotFound(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message=message,
            code="not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class Forbidden(AppException):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            code="forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class Conflict(AppException):
    """Used for concurrency version mismatches and conflicts."""

    def __init__(self, message: str = "Resource version conflict"):
        super().__init__(
            message=message,
            code="conflict",
            status_code=status.HTTP_409_CONFLICT,
        )


class ValidationFailed(AppException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(
            message=message,
            code="validation_failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class RateLimited(AppException):
    def __init__(self, message: str = "Rate limit exceeded. Please retry later."):
        super().__init__(
            message=message,
            code="rate_limited",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class Unauthorized(AppException):
    def __init__(self, message: str = "Authentication required or invalid token"):
        super().__init__(
            message=message,
            code="unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class NotImplementedException(AppException):
    def __init__(self, message: str = "Endpoint stubbed. Implementation coming in subsequent phase."):
        super().__init__(
            message=message,
            code="not_implemented",
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register uniform error envelope handlers across the application."""
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        req_id = get_current_request_id() or getattr(request.state, "request_id", "")
        envelope = {
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": req_id,
            }
        }
        return JSONResponse(status_code=exc.status_code, content=envelope)

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
        req_id = get_current_request_id() or getattr(request.state, "request_id", "")
        code_map = {
            404: "not_found",
            401: "unauthorized",
            403: "forbidden",
            405: "method_not_allowed",
            409: "conflict",
            422: "validation_failed",
            429: "rate_limited",
        }
        code = code_map.get(exc.status_code, "http_error")
        envelope = {
            "error": {
                "code": code,
                "message": str(exc.detail),
                "request_id": req_id,
            }
        }
        return JSONResponse(status_code=exc.status_code, content=envelope)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = get_current_request_id() or getattr(request.state, "request_id", "")
        messages = []
        for error in exc.errors():
            loc = " -> ".join(str(item) for item in error.get("loc", []))
            msg = error.get("msg", "Invalid value")
            messages.append(f"{loc}: {msg}")
        joined_msg = "; ".join(messages) if messages else "Invalid request parameters"

        envelope = {
            "error": {
                "code": "validation_failed",
                "message": joined_msg,
                "request_id": req_id,
            }
        }
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=envelope)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        req_id = get_current_request_id() or getattr(request.state, "request_id", "")
        logger.error(f"Unhandled server error: {exc}", exc_info=True)
        envelope = {
            "error": {
                "code": "internal_error",
                "message": "An unexpected internal server error occurred",
                "request_id": req_id,
            }
        }
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=envelope)

