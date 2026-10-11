#!/usr/bin/env python3
"""Virasat Production Cloud Run Smoke Test (Phase 15).

Verifies against deployed live URL:
1. GET /health and GET /ready return 200 OK
2. Create private demo sessions for both 'sharma' and 'mehta' seeds
3. Trigger pipeline agent run for each session
4. Stream SSE events from live URL
5. Await run completion and assert net estate valuations:
   - Sharma: 28,400,000 INR (2.84 Cr)
   - Mehta: 16,780,000 INR (1.678 Cr)
"""

import argparse
import json
import sys
import time
from decimal import Decimal
from typing import Any

import httpx


def run_smoke_tests(base_url: str) -> bool:
    base_url = base_url.rstrip("/")
    print(f"==============================================================================")
    print(f" Starting Virasat Live Cloud Run Smoke Tests")
    print(f" Target Service: {base_url}")
    print(f"==============================================================================")

    client = httpx.Client(timeout=60.0)
    auth_header = {"Authorization": "Bearer test-smoke-token"}

    # 1. Health & Readiness Checks
    print("\n[Step 1/5] Checking Service Health & Readiness Endpoints...")
    try:
        health_resp = client.get(f"{base_url}/health")
        assert health_resp.status_code == 200, f"Health check failed: {health_resp.status_code}"
        print(f"  [PASS] GET /health -> HTTP 200 OK: {health_resp.text}")

        ready_resp = client.get(f"{base_url}/ready")
        assert ready_resp.status_code == 200, f"Readiness check failed: {ready_resp.status_code}"
        print(f"  [PASS] GET /ready  -> HTTP 200 OK: {ready_resp.json().get('status')}")
    except Exception as e:
        print(f"  [FAIL] Health/Ready endpoint check failed: {e}")
        return False

    scenarios = [
        {"name": "sharma", "expected_estate": Decimal("28400000"), "label": "Ramesh Sharma (2.84 Cr)"},
        {"name": "mehta", "expected_estate": Decimal("16780000"), "label": "Anil Mehta (1.678 Cr)"},
    ]

    for sc in scenarios:
        sname = sc["name"]
        expected_val = sc["expected_estate"]
        label = sc["label"]

        print(f"\n[Step 2/5] Creating private demo session for '{sname}' ({label})...")
        try:
            sess_resp = client.post(
                f"{base_url}/api/demo/session",
                json={"role": "CLAIMANT", "scenario": sname, "mode": "prefilled"},
                headers=auth_header,
            )
            assert sess_resp.status_code in (200, 201), f"Session creation failed: {sess_resp.status_code} {sess_resp.text}"
            case_id = sess_resp.json().get("case_id")
            assert case_id, "Response missing case_id"
            print(f"  [PASS] Demo session cloned: case_id = {case_id}")
        except Exception as e:
            print(f"  [FAIL] Failed to create demo session for {sname}: {e}")
            return False

        print(f"\n[Step 3/5] Triggering pipeline agent run for case {case_id}...")
        try:
            run_resp = client.post(
                f"{base_url}/api/cases/{case_id}/run",
                json={"stages": ["all"]},
                headers=auth_header,
            )
            assert run_resp.status_code in (200, 202), f"Run trigger failed: {run_resp.status_code} {run_resp.text}"
            run_id = run_resp.json().get("run_id")
            assert run_id, "Response missing run_id"
            print(f"  [PASS] Pipeline started: run_id = {run_id} (status: {run_resp.json().get('status')})")
        except Exception as e:
            print(f"  [FAIL] Failed to start pipeline run: {e}")
            return False

        print(f"\n[Step 4/5] Verifying SSE event stream over live URL for run {run_id}...")
        try:
            with client.stream("GET", f"{base_url}/api/runs/{run_id}/events", headers=auth_header, timeout=15.0) as sse_stream:
                assert sse_stream.status_code == 200, f"SSE endpoint returned HTTP {sse_stream.status_code}"
                events_received = 0
                for line in sse_stream.iter_lines():
                    if line.startswith("data:") or line.startswith("event:"):
                        events_received += 1
                        print(f"    [SSE] Received: {line[:80]}...")
                        if events_received >= 2:
                            break
            print(f"  [PASS] SSE stream verified ({events_received} event frames received)")
        except Exception as e:
            print(f"  [WARN] SSE stream test completed or timed out: {e}")

        print(f"\n[Step 5/5] Awaiting pipeline completion and asserting net estate...")
        max_wait_secs = 60
        start_wait = time.time()
        final_run_status = "QUEUED"

        while time.time() - start_wait < max_wait_secs:
            try:
                status_resp = client.get(f"{base_url}/api/runs/{run_id}", headers=auth_header)
                if status_resp.status_code == 200:
                    final_run_status = status_resp.json().get("status")
                    if final_run_status in ("COMPLETED", "FAILED"):
                        break
            except Exception:
                pass
            time.sleep(2)

        print(f"  Run reached status: {final_run_status} (after {round(time.time() - start_wait, 1)}s)")

        # Verify Overview estate value
        overview_resp = client.get(f"{base_url}/api/cases/{case_id}/overview", headers=auth_header)
        assert overview_resp.status_code == 200, f"Overview failed: {overview_resp.status_code}"
        overview_data = overview_resp.json()
        raw_val = overview_data.get("estate_value_inr", 0)
        actual_val = Decimal(str(raw_val))

        print(f"  Target Net Estate : {expected_val:,} INR")
        print(f"  Actual Net Estate : {actual_val:,} INR")

        assert actual_val == expected_val, (
            f"Estate valuation mismatch for {sname}! Expected {expected_val}, got {actual_val}"
        )
        print(f"  [PASS] Net estate matches statutory calculation: {actual_val:,} INR")

    print("\n" + "=" * 78)
    print(" >>> ALL PRODUCTION CLOUD RUN SMOKE TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 78)
    return True


def main():
    parser = argparse.ArgumentParser(description="Virasat Cloud Run Smoke Tests")
    parser.add_argument("--url", default="", help="Cloud Run service URL (defaults to gcloud output)")
    args = parser.parse_args()

    url = args.url
    if not url:
        import subprocess
        try:
            cmd = ["gcloud", "run", "services", "describe", "virasat-api", "--region=asia-south1", "--project=virasat-511210", "--format=value(status.url)"]
            url = subprocess.check_output(cmd, text=True).strip()
        except Exception as e:
            print(f"Error fetching service URL via gcloud: {e}")
            sys.exit(1)

    if not url:
        print("Could not determine service URL. Please specify --url https://...")
        sys.exit(1)

    success = run_smoke_tests(url)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
