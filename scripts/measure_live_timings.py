#!/usr/bin/env python3
"""
scripts/measure_live_timings.py
Measures:
1. Cold-ish request time to /health on Cloud Run
2. One full agent run on a cloned Sharma case
3. One full agent run on a cloned Mehta case
"""

import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

API_BASE = "https://virasat-api-275851497852.asia-south1.run.app"
LIVE_URL = "https://virasat-511210.web.app"
OUT_FILE = Path("docs/perf/live_timings.json")
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

def measure():
    print(f"=== Measuring Live API Performance ({API_BASE}) ===")
    results = {}

    # 1. GET /health
    t0 = time.time()
    req = urllib.request.Request(f"{API_BASE}/health")
    with urllib.request.urlopen(req) as resp:
        health_body = json.loads(resp.read().decode())
    health_ms = round((time.time() - t0) * 1000, 2)
    print(f"1. GET /health response time: {health_ms} ms (response: {health_body})")
    results["health_check_ms"] = health_ms
    results["health_response"] = health_body

    # 2. Acquire valid Firebase Auth Token via Playwright
    print("\n2. Initializing browser session to obtain valid Firebase Auth Token...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(f"{LIVE_URL}/demo", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(1500)

        judge_card = page.locator('div[role="button"]:has-text("Judge Mode")')
        if not judge_card.is_visible():
            judge_card = page.locator('div[role="button"]:has-text("Judge")')
        if judge_card.is_visible():
            judge_card.first.click()
            page.wait_for_timeout(800)

        enter_btn = page.locator('button:has-text("Enter Demo")')
        if enter_btn.is_visible():
            enter_btn.click()
        
        page.wait_for_url("**/case/**", timeout=30000)
        page.wait_for_timeout(2500)

        token = page.evaluate("""async () => {
            return new Promise((resolve) => {
                const req = indexedDB.open('firebaseLocalStorageDb');
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
                        resolve(null);
                        return;
                    }
                    const tx = db.transaction('firebaseLocalStorage', 'readonly');
                    const store = tx.objectStore('firebaseLocalStorage');
                    const getAll = store.getAll();
                    getAll.onsuccess = () => {
                        const items = getAll.result || [];
                        const userItem = items.find(it => it.value && it.value.stsTokenManager);
                        if (userItem) {
                            resolve(userItem.value.stsTokenManager.accessToken);
                        } else {
                            resolve(null);
                        }
                    };
                    getAll.onerror = () => resolve(null);
                };
                req.onerror = () => resolve(null);
            });
        }""")
        browser.close()

    if not token:
        print("   Warning: Could not acquire Firebase token from browser; using anonymous token")
    else:
        print(f"   Authenticated Firebase ID Token acquired successfully (length: {len(token)})")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Helper for API requests
    def api_call(path, method="GET", data=None):
        url = f"{API_BASE}{path}"
        body = json.dumps(data).encode() if data is not None else None
        r = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode())

    # 3. Benchmark Sharma Case Run
    print("\n3. Benchmarking Full Agent Run: Sharma Case (Intestate, 7 Assets, Complex Class I)...")
    clone_sharma = api_call("/api/demo/session", method="POST", data={"scenario": "sharma", "mode": "prefilled"})
    sharma_cid = clone_sharma["case_id"]
    print(f"   Cloned Sharma case: {sharma_cid}")

    t_start_sharma = time.time()
    run_init = api_call(f"/api/cases/{sharma_cid}/run", method="POST", data={})
    sharma_rid = run_init.get("run_id")
    print(f"   Run started: run_id={sharma_rid}, initial status={run_init.get('status')}. Polling for completion...")

    sharma_status = "QUEUED"
    sharma_duration = None
    for i in range(40):
        time.sleep(1)
        try:
            curr = api_call(f"/api/runs/{sharma_rid}")
            st = curr.get("status", "")
            print(f"   [t={i+1}s] Run status: {st}")
            if st in ("DONE", "COMPLETED", "SUCCESS"):
                sharma_duration = round(time.time() - t_start_sharma, 2)
                sharma_status = st
                print(f"   Sharma pipeline completed in {sharma_duration} s! (Status: {st})")
                break
            elif st in ("FAILED", "ERROR"):
                sharma_duration = round(time.time() - t_start_sharma, 2)
                sharma_status = st
                print(f"   Sharma pipeline failed in {sharma_duration} s")
                break
        except Exception as e:
            print(f"   Polling error: {e}")
    if not sharma_duration:
        sharma_duration = round(time.time() - t_start_sharma, 2)

    results["sharma_run"] = {
        "case_id": sharma_cid,
        "run_id": sharma_rid,
        "duration_sec": sharma_duration,
        "status": sharma_status
    }

    # 4. Benchmark Mehta Case Run
    print("\n4. Benchmarking Full Agent Run: Mehta Case (Testate, Registered Will, 3 Assets)...")
    clone_mehta = api_call("/api/demo/session", method="POST", data={"scenario": "mehta", "mode": "prefilled"})
    mehta_cid = clone_mehta["case_id"]
    print(f"   Cloned Mehta case: {mehta_cid}")

    t_start_mehta = time.time()
    run_init_m = api_call(f"/api/cases/{mehta_cid}/run", method="POST", data={})
    mehta_rid = run_init_m.get("run_id")
    print(f"   Run started: run_id={mehta_rid}, initial status={run_init_m.get('status')}. Polling for completion...")

    mehta_status = "QUEUED"
    mehta_duration = None
    for i in range(40):
        time.sleep(1)
        try:
            curr_m = api_call(f"/api/runs/{mehta_rid}")
            st = curr_m.get("status", "")
            print(f"   [t={i+1}s] Run status: {st}")
            if st in ("DONE", "COMPLETED", "SUCCESS"):
                mehta_duration = round(time.time() - t_start_mehta, 2)
                mehta_status = st
                print(f"   Mehta pipeline completed in {mehta_duration} s! (Status: {st})")
                break
            elif st in ("FAILED", "ERROR"):
                mehta_duration = round(time.time() - t_start_mehta, 2)
                mehta_status = st
                print(f"   Mehta pipeline failed in {mehta_duration} s")
                break
        except Exception as e:
            print(f"   Polling error: {e}")
    if not mehta_duration:
        mehta_duration = round(time.time() - t_start_mehta, 2)

    results["mehta_run"] = {
        "case_id": mehta_cid,
        "run_id": mehta_rid,
        "duration_sec": mehta_duration,
        "status": mehta_status
    }

    OUT_FILE.write_text(json.dumps(results, indent=2))
    print(f"\nTiming results written to {OUT_FILE}")

if __name__ == "__main__":
    measure()
