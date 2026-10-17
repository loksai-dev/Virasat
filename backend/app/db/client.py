"""Spanner Client and Transaction Helpers for Virasat."""

import logging
from collections.abc import Callable
from contextlib import contextmanager
from typing import TypeVar

from google.cloud.spanner_v1.snapshot import Snapshot
from google.cloud.spanner_v1.transaction import Transaction

from app.config import get_settings
from app.deps import get_spanner_database

logger = logging.getLogger(__name__)

T = TypeVar("T")


def get_db():
    """Return configured Spanner database handle."""
    settings = get_settings()
    return get_spanner_database(settings)


@contextmanager
def snapshot_context():
    """Context manager yielding a multi-use read-only snapshot."""
    db = get_db()
    with db.snapshot(multi_use=True) as snapshot:
        yield snapshot



import time
from app.services.timing import record_spanner_query


def run_in_snapshot[T](func: Callable[[Snapshot], T]) -> T:
    """Execute callable inside a read-only snapshot."""
    t0 = time.perf_counter()
    with snapshot_context() as snapshot:
        res = func(snapshot)
    dur_ms = (time.perf_counter() - t0) * 1000.0
    record_spanner_query("snapshot", dur_ms)
    return res


def run_in_transaction[T](func: Callable[[Transaction], T]) -> T:
    """Execute callable inside a read-write transaction with automatic retry on Aborted.

    Spanner's database.run_in_transaction automatically handles Aborted exceptions
    and retries the transaction until commit succeeds or a non-retryable error occurs.
    """
    t0 = time.perf_counter()
    db = get_db()
    res = db.run_in_transaction(func)
    dur_ms = (time.perf_counter() - t0) * 1000.0
    record_spanner_query("transaction", dur_ms)
    return res
