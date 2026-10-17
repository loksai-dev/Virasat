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


import datetime

@contextmanager
def snapshot_context(max_staleness_sec: int | None = None):
    """Context manager yielding a multi-use read-only snapshot.
    
    If max_staleness_sec is provided, uses bounded staleness for local replica reads.
    """
    db = get_db()
    if max_staleness_sec and max_staleness_sec > 0:
        staleness = datetime.timedelta(seconds=max_staleness_sec)
        with db.snapshot(max_staleness=staleness) as snapshot:
            yield snapshot
    else:
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


def run_in_bounded_staleness_snapshot[T](func: Callable[[Snapshot], T], max_staleness_sec: int = 10) -> T:
    """Execute callable inside a bounded-staleness snapshot (e.g. 10s) for read-only dashboards."""
    t0 = time.perf_counter()
    with snapshot_context(max_staleness_sec=max_staleness_sec) as snapshot:
        res = func(snapshot)
    dur_ms = (time.perf_counter() - t0) * 1000.0
    record_spanner_query("bounded_snapshot", dur_ms)
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
