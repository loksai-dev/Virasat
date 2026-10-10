"""Spanner Client and Transaction Helpers for Virasat."""

from contextlib import contextmanager
import logging
from typing import Callable, TypeVar
from google.cloud import spanner
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
    """Context manager yielding a read-only snapshot."""
    db = get_db()
    with db.snapshot() as snapshot:
        yield snapshot


def run_in_snapshot(func: Callable[[Snapshot], T]) -> T:
    """Execute callable inside a read-only snapshot."""
    with snapshot_context() as snapshot:
        return func(snapshot)


def run_in_transaction(func: Callable[[Transaction], T]) -> T:
    """Execute callable inside a read-write transaction with automatic retry on Aborted.

    Spanner's database.run_in_transaction automatically handles Aborted exceptions
    and retries the transaction until commit succeeds or a non-retryable error occurs.
    """
    db = get_db()
    return db.run_in_transaction(func)
