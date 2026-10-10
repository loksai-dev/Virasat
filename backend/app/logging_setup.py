import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

# Context variable for tracing request_id across async execution
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


def get_current_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_ctx.get()


class JSONFormatter(logging.Formatter):
    """Structured JSON formatter adhering to Google Cloud Logging conventions.

    CRITICAL SECURITY & PRIVACY RULE:
    Never log request bodies, document content, or full account numbers.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "severity": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_current_request_id() or getattr(record, "request_id", None),
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include custom extra attributes if present and safe
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            # Guard against sensitive keys
            safe_extra = {
                k: v
                for k, v in record.extra_data.items()
                if k not in {"body", "document_text", "payload", "account_number"}
            }
            log_entry.update(safe_extra)

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger to use JSONFormatter with standard output."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = True
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
