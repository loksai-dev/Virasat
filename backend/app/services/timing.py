"""Lightweight timing spans and structured performance telemetry for Virasat.

Captures:
- Model calls: model, input_tokens, output_tokens, duration_ms
- Spanner queries / transactions: operation, duration_ms, table
- Agent stages: stage, duration_ms
- GCS calls: operation, duration_ms, blob
- Full run: total duration, aggregated tokens, span breakdowns

Emits structured JSON logs conforming to Google Cloud Logging conventions
and collects spans for reporting without altering outputs.
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any

logger = logging.getLogger("virasat.perf")

# Active collector context variable
_active_spans_ctx: ContextVar[list[dict[str, Any]] | None] = ContextVar("perf_spans", default=None)


class PerfCollector:
    """Collects timing spans within a scoped context (e.g., an agent run)."""

    def __init__(self):
        self.spans: list[dict[str, Any]] = []
        self._token: Any = None

    def __enter__(self) -> PerfCollector:
        self._token = _active_spans_ctx.set(self.spans)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._token:
            _active_spans_ctx.reset(self._token)

    def summary(self) -> dict[str, Any]:
        """Aggregate spans by category and compute token totals."""
        by_category: dict[str, list[float]] = {}
        total_prompt_tokens = 0
        total_output_tokens = 0

        for s in self.spans:
            cat = s.get("category", "other")
            dur = s.get("duration_ms", 0.0)
            by_category.setdefault(cat, []).append(dur)

            if cat == "model":
                total_prompt_tokens += int(s.get("input_tokens", 0) or 0)
                total_output_tokens += int(s.get("output_tokens", 0) or 0)

        stage_timings = {
            s["name"]: s["duration_ms"]
            for s in self.spans
            if s.get("category") == "stage"
        }

        return {
            "total_spans": len(self.spans),
            "stages": stage_timings,
            "tokens": {
                "input_tokens": total_prompt_tokens,
                "output_tokens": total_output_tokens,
                "total_tokens": total_prompt_tokens + total_output_tokens,
            },
            "spans": self.spans,
        }


def add_span(
    name: str,
    category: str,
    duration_ms: float,
    details: dict[str, Any] | None = None,
) -> None:
    """Record a timing span in active collector and log structured JSON."""
    span_data: dict[str, Any] = {
        "name": name,
        "category": category,
        "duration_ms": round(duration_ms, 2),
    }
    if details:
        span_data.update(details)

    collector = _active_spans_ctx.get()
    if collector is not None:
        collector.append(span_data)

    logger.info(
        "PerfSpan: [%s] %s finished in %.2f ms",
        category,
        name,
        duration_ms,
        extra={"extra_data": span_data},
    )


@contextmanager
def time_span(name: str, category: str = "generic", details: dict[str, Any] | None = None):
    """Context manager to measure and record execution time of a code block."""
    t0 = time.perf_counter()
    info = dict(details) if details else {}
    try:
        yield info
    finally:
        t1 = time.perf_counter()
        dur = (t1 - t0) * 1000.0
        add_span(name, category, dur, info)


def record_model_call(
    model: str,
    duration_ms: float,
    input_tokens: int = 0,
    output_tokens: int = 0,
    operation: str = "generate_content",
    cached: bool = False,
) -> None:
    """Record structured metrics for a Vertex AI Gemini call."""
    add_span(
        name=f"{operation}:{model}",
        category="model",
        duration_ms=duration_ms,
        details={
            "model": model,
            "operation": operation,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cached": cached,
        },
    )


def record_spanner_query(
    operation: str,
    duration_ms: float,
    table: str = "",
) -> None:
    """Record structured metrics for a Cloud Spanner operation."""
    add_span(
        name=f"spanner:{operation}:{table}" if table else f"spanner:{operation}",
        category="spanner",
        duration_ms=duration_ms,
        details={"operation": operation, "table": table},
    )


def record_gcs_call(
    operation: str,
    duration_ms: float,
    blob_name: str = "",
) -> None:
    """Record structured metrics for a Cloud Storage call."""
    add_span(
        name=f"gcs:{operation}",
        category="gcs",
        duration_ms=duration_ms,
        details={"operation": operation, "blob": blob_name},
    )
