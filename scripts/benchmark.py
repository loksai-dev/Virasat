#!/usr/bin/env python3
"""Virasat Production Cloud Run Benchmark Suite.

Measures:
1. Cold start / initial request latency.
2. Warm p50 and p95 latencies for key endpoints (/health, /ready, /overview, /shares, /graph, /claims, /disputes).
3. Deterministic succession rules engine execution time (in ms).
4. Full autonomous agent pipeline run duration (in seconds).
"""

import argparse
import json
import statistics
import sys
import time
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import httpx

# Ensure backend directory is in path for rules engine benchmarking
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engines.succession_rules import compute


def percentile(data: list[float], p: float) -> float:
    """Calculate the p-th percentile from sorted list."""
    if not data:
        return 0.0
    k = (len(data) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1
    if c < len(data):
        return data[f] + (k - f) * (data[c] - data[f])
    return data[f]


def benchmark_endpoint(client: httpx.Client, url: str, headers: dict[str, str], n_samples: int = 10) -> dict[str, float]:
    """Measure request latencies (ms) over n_samples."""
    latencies: list[float] = []
    status_codes: list[int] = []
    for _ in range(n_samples):
        t0 = time.perf_counter()
        resp = client.get(url, headers=headers)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)
        status_codes.append(resp.status_code)
        time.sleep(0.05)

    latencies.sort()
    return {
        "samples": len(latencies),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
        "mean_ms": round(statistics.mean(latencies), 2),
        "p50_ms": round(percentile(latencies, 50.0), 2),
        "p95_ms": round(percentile(latencies, 95.0), 2),
        "status_code": status_codes[0] if status_codes else 0,
    }


def benchmark_rules_engine(iterations: int = 50) -> dict[str, float]:
    """Measure execution latency of deterministic succession rules engine locally."""
    # Synthetic estate snapshot for benchmark
    snapshot = {
        "case_id": "bench-case",
        "deceased": {
            "person_id": "P-DEC",
            "name": "Ramesh Sharma",
            "dod": "2026-01-15",
            "personal_law": "hindu",
            "religion": "hindu",
        },
        "people": [
            {"person_id": "P-DEC", "name": "Ramesh Sharma", "role": "DECEASED", "sex": "M", "alive": False},
            {"person_id": "P-WIDOW", "name": "Sunita Sharma", "role": "SPOUSE", "sex": "F", "alive": True},
            {"person_id": "P-SON", "name": "Arjun Sharma", "role": "CHILD", "sex": "M", "alive": True},
            {"person_id": "P-DAUGHTER", "name": "Priya Sharma", "role": "CHILD", "sex": "F", "alive": True},
            {"person_id": "P-MOTHER", "name": "Kamala Sharma", "role": "PARENT", "sex": "F", "alive": True},
        ],
        "relationships": [
            {"from_id": "P-WIDOW", "to_id": "P-DEC", "rel_type": "SPOUSE"},
            {"from_id": "P-SON", "to_id": "P-DEC", "rel_type": "CHILD"},
            {"from_id": "P-DAUGHTER", "to_id": "P-DEC", "rel_type": "CHILD"},
            {"from_id": "P-MOTHER", "to_id": "P-DEC", "rel_type": "PARENT"},
        ],
        "assets": [
            {
                "asset_id": "A-1",
                "type": "bank_account",
                "gross_value_inr": "5000000",
                "net_value_inr": "5000000",
                "nominees": [],
            },
            {
                "asset_id": "A-2",
                "type": "property",
                "gross_value_inr": "18000000",
                "net_value_inr": "18000000",
                "nominees": [],
            },
            {
                "asset_id": "A-3",
                "type": "demat",
                "gross_value_inr": "5400000",
                "net_value_inr": "5400000",
                "nominees": [],
            },
        ],
        "debts": [],
        "will": None,
    }

    latencies_ms: list[float] = []
    # Warmup
    compute(snapshot)

    for _ in range(iterations):
        t0 = time.perf_counter()
        res = compute(snapshot)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    latencies_ms.sort()
    return {
        "iterations": iterations,
        "min_ms": round(min(latencies_ms), 3),
        "max_ms": round(max(latencies_ms), 3),
        "mean_ms": round(statistics.mean(latencies_ms), 3),
        "p50_ms": round(percentile(latencies_ms, 50.0), 3),
        "p95_ms": round(percentile(latencies_ms, 95.0), 3),
    }


def run_benchmark(base_url: str) -> dict:
    base_url = base_url.rstrip("/")
    run_date = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    print("=" * 70)
    print(" Virasat Production Cloud Run Benchmark Runner")
    print(f" Target Service: {base_url}")
    print(f" Date / Time   : {run_date}")
    print("=" * 70)

    client = httpx.Client(timeout=60.0)
    auth_header = {"Authorization": "Bearer test-benchmark-token"}

    # 1. Cold start / initial request
    print("\n[1/5] Measuring Cold Start / Initial Request Latency...")
    t0 = time.perf_counter()
    init_resp = client.get(f"{base_url}/health")
    t1 = time.perf_counter()
    cold_start_ms = round((t1 - t0) * 1000.0, 2)
    print(f"  Initial GET /health latency: {cold_start_ms} ms (Status: {init_resp.status_code})")

    # 2. Warm health & ready
    print("\n[2/5] Benchmarking Warm Core Endpoints (10 samples each)...")
    health_bench = benchmark_endpoint(client, f"{base_url}/health", auth_header, n_samples=10)
    ready_bench = benchmark_endpoint(client, f"{base_url}/ready", auth_header, n_samples=10)
    print(f"  GET /health: p50 = {health_bench['p50_ms']} ms | p95 = {health_bench['p95_ms']} ms")
    print(f"  GET /ready : p50 = {ready_bench['p50_ms']} ms | p95 = {ready_bench['p95_ms']} ms")

    # 3. Create demo case for authenticated case endpoints
    print("\n[3/5] Setting up isolated benchmark session...")
    sess_resp = client.post(
        f"{base_url}/api/demo/session",
        json={"role": "CLAIMANT", "scenario": "sharma", "mode": "prefilled"},
        headers=auth_header,
    )
    case_id = sess_resp.json().get("case_id")
    print(f"  Benchmark Case Created: {case_id}")

    # Benchmarking case data endpoints
    overview_bench = benchmark_endpoint(client, f"{base_url}/api/cases/{case_id}/overview", auth_header, n_samples=10)
    shares_bench = benchmark_endpoint(client, f"{base_url}/api/cases/{case_id}/shares?scenario=current", auth_header, n_samples=10)
    graph_bench = benchmark_endpoint(client, f"{base_url}/api/cases/{case_id}/graph", auth_header, n_samples=10)
    claims_bench = benchmark_endpoint(client, f"{base_url}/api/cases/{case_id}/claims", auth_header, n_samples=10)
    disputes_bench = benchmark_endpoint(client, f"{base_url}/api/cases/{case_id}/disputes", auth_header, n_samples=10)

    print(f"  GET /cases/overview: p50 = {overview_bench['p50_ms']} ms | p95 = {overview_bench['p95_ms']} ms")
    print(f"  GET /cases/shares  : p50 = {shares_bench['p50_ms']} ms | p95 = {shares_bench['p95_ms']} ms")
    print(f"  GET /cases/graph   : p50 = {graph_bench['p50_ms']} ms | p95 = {graph_bench['p95_ms']} ms")
    print(f"  GET /cases/claims  : p50 = {claims_bench['p50_ms']} ms | p95 = {claims_bench['p95_ms']} ms")
    print(f"  GET /cases/disputes: p50 = {disputes_bench['p50_ms']} ms | p95 = {disputes_bench['p95_ms']} ms")

    # 4. Rules Engine Execution Benchmark
    print("\n[4/5] Benchmarking Local Succession Rules Engine (50 iterations)...")
    rules_bench = benchmark_rules_engine(iterations=50)
    print(f"  Rules Engine Compute: p50 = {rules_bench['p50_ms']} ms | p95 = {rules_bench['p95_ms']} ms (mean: {rules_bench['mean_ms']} ms)")

    # 5. Full Autonomous Multi-Agent Pipeline Run
    print("\n[5/5] Benchmarking Full Autonomous Multi-Agent Run on Cloud Run...")
    t_run_start = time.perf_counter()
    run_resp = client.post(
        f"{base_url}/api/cases/{case_id}/run",
        json={"stages": ["all"]},
        headers=auth_header,
    )
    run_id = run_resp.json().get("run_id")
    print(f"  Run triggered: {run_id}. Waiting for completion...")

    max_wait = 90
    poll_start = time.time()
    final_status = "QUEUED"
    while time.time() - poll_start < max_wait:
        st_resp = client.get(f"{base_url}/api/runs/{run_id}", headers=auth_header)
        if st_resp.status_code == 200:
            final_status = st_resp.json().get("status", "")
            if final_status in ("DONE", "COMPLETED", "FAILED"):
                break
        time.sleep(1.5)

    t_run_end = time.perf_counter()
    full_run_duration_sec = round(t_run_end - t_run_start, 2)
    print(f"  Full Agent Pipeline finished: status = {final_status} in {full_run_duration_sec}s")

    benchmark_summary = {
        "timestamp_utc": run_date,
        "base_url": base_url,
        "command": f"python scripts/benchmark.py --url={base_url}",
        "cold_start_initial_ms": cold_start_ms,
        "rules_engine_compute": rules_bench,
        "full_agent_run_duration_sec": full_run_duration_sec,
        "agent_run_status": final_status,
        "endpoints": {
            "GET /health": health_bench,
            "GET /ready": ready_bench,
            "GET /api/cases/{id}/overview": overview_bench,
            "GET /api/cases/{id}/shares": shares_bench,
            "GET /api/cases/{id}/graph": graph_bench,
            "GET /api/cases/{id}/claims": claims_bench,
            "GET /api/cases/{id}/disputes": disputes_bench,
        },
    }

    out_path = Path(__file__).resolve().parent / "benchmark_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_summary, f, indent=2)

    print("\n" + "=" * 70)
    print(" Benchmark Summary Table")
    print("=" * 70)
    print(f"{'Endpoint / Component':<32} | {'p50 (ms)':<10} | {'p95 (ms)':<10} | {'Status'}")
    print("-" * 70)
    print(f"{'Initial Ping (Cold/Warm)':<32} | {cold_start_ms:<10} | {'-':<10} | HTTP {init_resp.status_code}")
    print(f"{'GET /health':<32} | {health_bench['p50_ms']:<10} | {health_bench['p95_ms']:<10} | HTTP {health_bench['status_code']}")
    print(f"{'GET /ready':<32} | {ready_bench['p50_ms']:<10} | {ready_bench['p95_ms']:<10} | HTTP {ready_bench['status_code']}")
    print(f"{'GET /api/cases/overview':<32} | {overview_bench['p50_ms']:<10} | {overview_bench['p95_ms']:<10} | HTTP {overview_bench['status_code']}")
    print(f"{'GET /api/cases/shares':<32} | {shares_bench['p50_ms']:<10} | {shares_bench['p95_ms']:<10} | HTTP {shares_bench['status_code']}")
    print(f"{'GET /api/cases/graph':<32} | {graph_bench['p50_ms']:<10} | {graph_bench['p95_ms']:<10} | HTTP {graph_bench['status_code']}")
    print(f"{'GET /api/cases/claims':<32} | {claims_bench['p50_ms']:<10} | {claims_bench['p95_ms']:<10} | HTTP {claims_bench['status_code']}")
    print(f"{'GET /api/cases/disputes':<32} | {disputes_bench['p50_ms']:<10} | {disputes_bench['p95_ms']:<10} | HTTP {disputes_bench['status_code']}")
    print(f"{'Rules Engine Compute (Local)':<32} | {rules_bench['p50_ms']:<10} | {rules_bench['p95_ms']:<10} | Deterministic")
    print(f"{'Full Autonomous Agent Run':<32} | {full_run_duration_sec * 1000:<10} | {'-':<10} | {final_status} ({full_run_duration_sec}s)")
    print("=" * 70)
    print(f"Results written to: {out_path}")
    return benchmark_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="https://virasat-api-275851497852.asia-south1.run.app")
    args = parser.parse_args()
    run_benchmark(args.url)
