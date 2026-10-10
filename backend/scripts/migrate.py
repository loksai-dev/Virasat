#!/usr/bin/env python3
"""Cloud Spanner Database Migration Runner for Virasat (backend wrapper)."""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "scripts"))

from migrate import main  # noqa: E402

if __name__ == "__main__":
    main()

