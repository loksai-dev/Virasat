PYTHON ?= python

.PHONY: all eval test run clean

all: eval

eval:
	cd backend && $(PYTHON) eval/run_eval.py

test:
	cd backend && $(PYTHON) -m pytest -v

run:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --port 8000

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
