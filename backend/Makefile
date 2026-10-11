PYTHON ?= python

.PHONY: all eval test run clean

all: eval

eval:
	$(PYTHON) eval/run_eval.py

test:
	$(PYTHON) -m pytest -v

run:
	$(PYTHON) -m uvicorn app.main:app --reload --port 8000

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
