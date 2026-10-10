#!/usr/bin/env python3
"""Backend wrapper for scripts/graph_smoke.py."""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "scripts"))

from graph_smoke import run_smoke_test  # noqa: E402

if __name__ == "__main__":
    run_smoke_test()

