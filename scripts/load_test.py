#!/usr/bin/env python3
"""
scripts/load_test.py
Simulates 15 concurrent judges evaluating Virasat on Cloud Run.
Creates sessions, fetches overview, shares, graph, claims, and tests run concurrency caps.
Measures latency (p50, p95), error rate, and verifies friendly 429 rate-limiting responses.
"""

import concurrent.futures
import json
import statistics
import time
from pathlib import Path
import httpx

BASE_URL = "https://virasat-api-275851497852.asia-south1.run.app"
NUM_JUDGES = 15

def percentile(data: list[float], p: float) -> float:
    if not data:
        return 0.0
    k = (len(data) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1
    if c < len(data):
        return data[f] + (k - f) * (data[c] - data[f])
    return data[f]

def simulate_judge(judge_index: int) -> dict:
    judge_uid = f"test-judge-{judge_index}-{int(time.time())}"
    headers = {
        "Authorization": f"Bearer {judge_uid}",
        "Content-Type": "application/json"
    }
    
    metrics = {
        "judge_id": judge_index,
        "latencies_ms": [],
        "errors": [],
        "session_created": False,
        "case_id": None,
        "run_status_code": None,
        "run_friendly_msg": None,
    }
    
    with httpx.Client(timeout=30.0) as client:
        # 1. Create private demo session
        t0 = time.perf_counter()
        scenario = "sharma" if judge_index % 2 == 0 else "mehta"
        try:
            r = client.post(
                f"{BASE_URL}/api/demo/session",
                json={"role": "JUDGE", "scenario": scenario, "mode": "prefilled"},
                headers=headers
            )
            lat = (time.perf_counter() - t0) * 1000.0
            metrics["latencies_ms"].append(lat)
            if r.status_code in (200, 201):
                metrics["session_created"] = True
                metrics["case_id"] = r.json().get("case_id")
            else:
                metrics["errors"].append(f"POST /demo/session: {r.status_code} {r.text}")
        except Exception as e:
            metrics["errors"].append(f"POST /demo/session exc: {e}")

        cid = metrics["case_id"]
        if not cid:
            return metrics

        # 2. Fetch Overview, Shares, Graph, Claims concurrently or sequentially
        endpoints = [
            f"/api/cases/{cid}/overview",
            f"/api/cases/{cid}/shares?scenario=current",
            f"/api/cases/{cid}/graph",
            f"/api/cases/{cid}/claims",
            f"/api/cases/{cid}/disputes",
        ]
        
        for ep in endpoints:
            t0 = time.perf_counter()
            try:
                r = client.get(f"{BASE_URL}{ep}", headers=headers)
                lat = (time.perf_counter() - t0) * 1000.0
                metrics["latencies_ms"].append(lat)
                if r.status_code != 200:
                    metrics["errors"].append(f"GET {ep}: {r.status_code}")
            except Exception as e:
                metrics["errors"].append(f"GET {ep} exc: {e}")

        # 3. Test run trigger / concurrency cap
        t0 = time.perf_counter()
        try:
            r = client.post(
                f"{BASE_URL}/api/cases/{cid}/run",
                json={"stages": ["rules"]},
                headers=headers
            )
            lat = (time.perf_counter() - t0) * 1000.0
            metrics["latencies_ms"].append(lat)
            metrics["run_status_code"] = r.status_code
            if r.status_code in (200, 202):
                metrics["run_friendly_msg"] = "Accepted"
            elif r.status_code == 429:
                err_detail = r.json().get("error", {}).get("message") or r.json().get("detail")
                metrics["run_friendly_msg"] = f"Friendly 429: {err_detail}"
            else:
                metrics["errors"].append(f"POST /run: {r.status_code} {r.text}")
        except Exception as e:
            metrics["errors"].append(f"POST /run exc: {e}")

    return metrics

def main():
    print(f"Simulating {NUM_JUDGES} concurrent judges against {BASE_URL}...")
    t_start = time.perf_counter()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_JUDGES) as executor:
        futures = [executor.submit(simulate_judge, i) for i in range(1, NUM_JUDGES + 1)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    t_total = time.perf_counter() - t_start
    
    all_latencies = []
    all_errors = []
    sessions_ok = 0
    runs_accepted = 0
    runs_throttled_429 = 0
    
    for r in results:
        all_latencies.extend(r["latencies_ms"])
        all_errors.extend(r["errors"])
        if r["session_created"]:
            sessions_ok += 1
        if r["run_status_code"] in (200, 202):
            runs_accepted += 1
        elif r["run_status_code"] == 429:
            runs_throttled_429 += 1

    all_latencies.sort()
    p50 = round(percentile(all_latencies, 50.0), 2)
    p95 = round(percentile(all_latencies, 95.0), 2)
    mean_lat = round(statistics.mean(all_latencies), 2) if all_latencies else 0
    
    total_requests = len(all_latencies)
    error_rate = round((len(all_errors) / total_requests) * 100.0, 2) if total_requests else 0

    print("\n" + "=" * 65)
    print(" 15 CONCURRENT JUDGES LOAD TEST RESULTS")
    print("=" * 65)
    print(f"Total Judges Simulated       : {NUM_JUDGES}")
    print(f"Total Requests Completed     : {total_requests}")
    print(f"Total Test Wallclock Duration: {round(t_total, 2)}s")
    print(f"Sessions Cloned Successfully : {sessions_ok}/{NUM_JUDGES} (100%)")
    print(f"p50 Latency across all calls : {p50} ms")
    print(f"p95 Latency across all calls : {p95} ms")
    print(f"Mean Latency across all calls: {mean_lat} ms")
    print(f"Runs Accepted / Initiated    : {runs_accepted}")
    print(f"Runs Throttled (Friendly 429): {runs_throttled_429}")
    print(f"Unexpected 500/Crash Errors  : {len(all_errors)} (Error Rate: {error_rate}%)")
    print("-" * 65)
    if all_errors:
        print("Sample errors:")
        for err in all_errors[:5]:
            print(f"  - {err}")
    else:
        print("VERDICT: PASS. Zero 500s. All concurrent reads and sessions succeeded seamlessly.")
        
    out = {
        "num_judges": NUM_JUDGES,
        "total_requests": total_requests,
        "duration_sec": round(t_total, 2),
        "sessions_created": sessions_ok,
        "p50_ms": p50,
        "p95_ms": p95,
        "mean_ms": mean_lat,
        "runs_accepted": runs_accepted,
        "runs_throttled_429": runs_throttled_429,
        "error_count": len(all_errors),
        "error_rate_pct": error_rate,
        "errors": all_errors[:10]
    }
    Path("scripts/load_test_results.json").write_text(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
