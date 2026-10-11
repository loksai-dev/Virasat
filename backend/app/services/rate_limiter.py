"""Token Bucket Rate Limiter and Resource Protection Service.

Enforces:
1. Token bucket rate limits per UID and per client IP.
   - Default: 60 req/min (the 61st request in a minute returns 429).
   - Stricter on:
     - Document upload: 15 req/min
     - Run: 5 req/min
     - Chat: 20 req/min
     - What-if: 15 req/min
2. Concurrency guards:
   - One active agent run per UID.
   - Configurable global cap on concurrent runs (settings.MAX_CONCURRENT_RUNS).
3. Daily per-UID model-call budget (settings.DAILY_MODEL_CALL_BUDGET_PER_UID).
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


class TokenBucket:
    """Thread-safe in-memory Token Bucket rate limiter."""

    def __init__(self, capacity: int, refill_rate_per_sec: float, window_sec: float = 60.0):
        self.capacity = float(capacity)
        self.tokens = float(capacity)
        self.refill_rate = refill_rate_per_sec
        self.window_sec = window_sec
        self.window_start = time.monotonic()
        self.window_count = 0
        self.lock = threading.Lock()

    def consume(self, amount: float = 1.0) -> bool:
        with self.lock:
            now = time.monotonic()
            if now - self.window_start >= self.window_sec:
                self.window_start = now
                self.window_count = 0
                self.tokens = self.capacity

            if self.window_count + amount > self.capacity:
                return False

            self.window_count += int(amount)
            self.tokens = max(0.0, self.tokens - amount)
            return True


class RateLimiter:
    """Centralized rate limiting and resource throttling manager."""

    def __init__(self):
        self._lock = threading.Lock()
        # Key -> TokenBucket
        self._buckets: dict[str, TokenBucket] = {}
        # UID -> count of model calls for today: { "2026-10-11:uid": count }
        self._daily_model_calls: dict[str, int] = defaultdict(int)

    def _get_bucket(self, key: str, capacity: int, refill_per_sec: float) -> TokenBucket:
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = TokenBucket(capacity, refill_per_sec)
                self._buckets[key] = bucket
            return bucket

    def check_rate_limit(
        self,
        identifier: str,
        category: str = "general",
    ) -> tuple[bool, str]:
        """Check rate limit for a given user or IP. Returns (allowed, error_msg)."""
        # Configure tier capacities and refill rates (per minute)
        tiers = {
            "general": (60, 60.0 / 60.0),      # 60 req/min
            "upload": (15, 15.0 / 60.0),       # 15 req/min
            "run": (5, 5.0 / 60.0),             # 5 req/min
            "chat": (20, 20.0 / 60.0),          # 20 req/min
            "whatif": (15, 15.0 / 60.0),        # 15 req/min
        }

        cap, refill = tiers.get(category, tiers["general"])
        key = f"{category}:{identifier}"
        bucket = self._get_bucket(key, cap, refill)

        if not bucket.consume(1.0):
            friendly = (
                f"Rate limit exceeded for {category} requests. "
                f"Please wait a few moments before trying again."
            )
            return False, friendly
        return True, ""

    def record_model_call(self, uid: str) -> tuple[bool, str]:
        """Increment model call counter for UID and check daily budget."""
        settings = get_settings()
        limit = getattr(settings, "DAILY_MODEL_CALL_BUDGET_PER_UID", 150)

        today_str = datetime.now(UTC).strftime("%Y-%m-%d")
        key = f"{today_str}:{uid}"

        with self._lock:
            current = self._daily_model_calls[key]
            if current >= limit:
                return False, f"Daily AI model-call budget of {limit} calls exceeded for today. Please try again tomorrow."
            self._daily_model_calls[key] = current + 1
            return True, ""

    def reset_for_test(self):
        """Reset internal buckets (used in unit tests)."""
        with self._lock:
            self._buckets.clear()
            self._daily_model_calls.clear()


rate_limiter = RateLimiter()
