#!/usr/bin/env python3
"""
scripts/audit_live_site.py
End-to-end automated audit of live Virasat deployment (https://virasat-511210.web.app).
Runs across Chromium (full Sharma & Mehta journeys), Firefox (smoke), and WebKit (smoke).
Captures screenshots, console errors, 401s, CORS errors, and measures loading times.
"""

import json
import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("AUDIT_URL", "https://virasat-511210.web.app")
SCREENSHOTS_DIR = Path("docs/submission/audit_screens")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

def audit_journey(browser_type_name, p, scenario_name="sharma", is_smoke=False):
    print(f"\n========================================================")
    print(f"Starting audit: Browser={browser_type_name}, Scenario={scenario_name}, Smoke={is_smoke}")
    print(f"========================================================")
    
    browser_type = getattr(p, browser_type_name)
    browser = browser_type.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        ignore_https_errors=True
    )
    page = context.new_page()

    console_errors = []
    page_errors = []
    failed_requests = []
    http_errors = []

    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error",) else None)
    page.on("pageerror", lambda err: page_errors.append(str(err)))
    page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url}: {req.failure}"))
    page.on("response", lambda resp: http_errors.append(f"{resp.status} {resp.url}") if resp.status >= 400 and not resp.url.endswith("/favicon.ico") and "google-analytics" not in resp.url else None)

    results = {
        "browser": browser_type_name,
        "scenario": scenario_name,
        "steps": [],
        "success": False
    }

    try:
        # Step 1: Open landing page
        t0 = time.time()
        print("1. Opening landing page...")
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(2000)
        t_landing = round(time.time() - t0, 2)
        landing_title = page.title()
        shot1 = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_01_landing.png"
        page.screenshot(path=str(shot1), full_page=False)
        print(f"   Loaded in {t_landing}s, Title: {landing_title}")
        results["steps"].append({"step": "landing", "duration_sec": t_landing, "screenshot": str(shot1)})

        # Step 2: Navigate to Demo portal
        print("2. Navigating to demo portal...")
        t0 = time.time()
        page.goto(f"{BASE_URL}/demo", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(1500)
        shot2 = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_02_demo_portal.png"
        page.screenshot(path=str(shot2), full_page=False)
        results["steps"].append({"step": "demo_portal", "screenshot": str(shot2)})

        # Select Judge role
        judge_card = page.locator('div[role="button"]:has-text("Judge Mode")')
        if not judge_card.is_visible():
            judge_card = page.locator('div[role="button"]:has-text("Judge")')
        if judge_card.is_visible():
            judge_card.first.click()
            page.wait_for_timeout(800)

        # Select scenario if Mehta
        if scenario_name == "mehta":
            mehta_btn = page.locator('button:has-text("Simple (Mehta)")')
            if not mehta_btn.is_visible():
                mehta_btn = page.locator('button:has-text("Mehta")')
            if mehta_btn.is_visible():
                mehta_btn.first.click()
                page.wait_for_timeout(800)

        # Click Enter Demo
        enter_btn = page.locator('button:has-text("Enter Demo")')
        if enter_btn.is_visible():
            enter_btn.click()
            print("   Clicked Enter Demo button...")
        
        # Wait for navigation to case workspace
        page.wait_for_url("**/case/**", timeout=30000)
        page.wait_for_timeout(2500)
        case_url = page.url
        print(f"   Navigated to case workspace: {case_url}")

        current_case_id = case_url.split("/case/")[1].split("/")[0] if "/case/" in case_url else "VR-2026-0142"

        # If on start wizard, take screenshot
        if "/start" in case_url:
            shot3 = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_03_wizard.png"
            page.screenshot(path=str(shot3), full_page=False)
            results["steps"].append({"step": "wizard", "url": case_url, "screenshot": str(shot3)})

        # Step 3: Overview page
        overview_url = f"{BASE_URL}/case/{current_case_id}/overview"
        print(f"3. Visiting Overview: {overview_url}...")
        page.goto(overview_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        shot_ov = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_04_overview.png"
        page.screenshot(path=str(shot_ov), full_page=False)
        results["steps"].append({"step": "overview", "url": overview_url, "screenshot": str(shot_ov)})

        if is_smoke:
            print("   Smoke test reached overview successfully!")
            results["success"] = True
            return results, console_errors, page_errors, http_errors

        # Step 4: AI Agents Page
        agents_url = f"{BASE_URL}/case/{current_case_id}/agents"
        print(f"4. Visiting AI Agents: {agents_url}...")
        page.goto(agents_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_ag = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_05_agents.png"
        page.screenshot(path=str(shot_ag), full_page=False)
        results["steps"].append({"step": "agents", "screenshot": str(shot_ag)})

        # Step 5: Kinship Graph & Family
        family_url = f"{BASE_URL}/case/{current_case_id}/family"
        print(f"5. Visiting Kinship Graph: {family_url}...")
        page.goto(family_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        shot_fam = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_06_family_graph.png"
        page.screenshot(path=str(shot_fam), full_page=False)
        results["steps"].append({"step": "family_graph", "screenshot": str(shot_fam)})

        # Step 6: Succession Shares & Statutory Citations
        shares_url = f"{BASE_URL}/case/{current_case_id}/family/shares"
        print(f"6. Visiting Succession Shares: {shares_url}...")
        page.goto(shares_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_sh = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_07_shares.png"
        page.screenshot(path=str(shot_sh), full_page=False)
        results["steps"].append({"step": "shares", "screenshot": str(shot_sh)})

        # Step 7: Estate Assets Folio
        assets_url = f"{BASE_URL}/case/{current_case_id}/assets"
        print(f"7. Visiting Estate Assets: {assets_url}...")
        page.goto(assets_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_as = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_08_assets.png"
        page.screenshot(path=str(shot_as), full_page=False)
        results["steps"].append({"step": "assets", "screenshot": str(shot_as)})

        # Step 8: Claims & Packaging
        claims_url = f"{BASE_URL}/case/{current_case_id}/claims"
        print(f"8. Visiting Institutional Claims: {claims_url}...")
        page.goto(claims_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_cl = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_09_claims.png"
        page.screenshot(path=str(shot_cl), full_page=False)
        results["steps"].append({"step": "claims", "screenshot": str(shot_cl)})

        # Step 9: Disputes & Fraud Guard
        disputes_url = f"{BASE_URL}/case/{current_case_id}/disputes"
        print(f"9. Visiting Dispute Guard: {disputes_url}...")
        page.goto(disputes_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_dp = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_10_disputes.png"
        page.screenshot(path=str(shot_dp), full_page=False)
        results["steps"].append({"step": "disputes", "screenshot": str(shot_dp)})

        # Step 10: Consent & Audit Hash Chain
        audit_url = f"{BASE_URL}/case/{current_case_id}/audit"
        print(f"10. Visiting Consent & Audit Trail: {audit_url}...")
        page.goto(audit_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_au = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_11_audit.png"
        page.screenshot(path=str(shot_au), full_page=False)
        results["steps"].append({"step": "audit", "screenshot": str(shot_au)})

        # Step 11: Ask Virasat (Multilingual AI)
        chat_url = f"{BASE_URL}/case/{current_case_id}/ask-virasat"
        print(f"11. Visiting Ask Virasat: {chat_url}...")
        page.goto(chat_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_ch = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_12_ask_virasat.png"
        page.screenshot(path=str(shot_ch), full_page=False)
        results["steps"].append({"step": "ask_virasat", "screenshot": str(shot_ch)})

        # Step 12: Institutional Dashboard
        inst_url = f"{BASE_URL}/institution"
        print(f"12. Visiting Bank/Insurer Operations Console: {inst_url}...")
        page.goto(inst_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        shot_in = SCREENSHOTS_DIR / f"{browser_type_name}_{scenario_name}_13_institution.png"
        page.screenshot(path=str(shot_in), full_page=False)
        results["steps"].append({"step": "institution", "screenshot": str(shot_in)})

        results["success"] = True
        print(f"Journey completed successfully for {scenario_name} on {browser_type_name}!")
    except Exception as e:
        print(f"Audit journey error: {e}")
        results["error"] = str(e)
    finally:
        browser.close()

    return results, console_errors, page_errors, http_errors

def main():
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": BASE_URL,
        "runs": []
    }

    with sync_playwright() as p:
        # Run 1: Chromium - Sharma (Complex, Intestate, Disputed Caveat)
        res_sharma, c_err1, p_err1, h_err1 = audit_journey("chromium", p, scenario_name="sharma", is_smoke=False)
        report["runs"].append({
            "test": "Chromium Sharma Full Journey",
            "results": res_sharma,
            "console_errors": c_err1,
            "page_errors": p_err1,
            "http_errors": h_err1
        })

        # Run 2: Chromium - Mehta (Simple, Registered Will)
        res_mehta, c_err2, p_err2, h_err2 = audit_journey("chromium", p, scenario_name="mehta", is_smoke=False)
        report["runs"].append({
            "test": "Chromium Mehta Full Journey",
            "results": res_mehta,
            "console_errors": c_err2,
            "page_errors": p_err2,
            "http_errors": h_err2
        })

        # Run 3: Firefox - Smoke
        try:
            res_ff, c_err3, p_err3, h_err3 = audit_journey("firefox", p, scenario_name="sharma", is_smoke=True)
            report["runs"].append({
                "test": "Firefox Smoke Test",
                "results": res_ff,
                "console_errors": c_err3,
                "page_errors": p_err3,
                "http_errors": h_err3
            })
        except Exception as e:
            print(f"Firefox test skipped/failed: {e}")

        # Run 4: WebKit - Smoke
        try:
            res_wk, c_err4, p_err4, h_err4 = audit_journey("webkit", p, scenario_name="sharma", is_smoke=True)
            report["runs"].append({
                "test": "WebKit Smoke Test",
                "results": res_wk,
                "console_errors": c_err4,
                "page_errors": p_err4,
                "http_errors": h_err4
            })
        except Exception as e:
            print(f"WebKit test skipped/failed: {e}")

    out_file = SCREENSHOTS_DIR / "playwright_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print(" PLAYWRIGHT AUDIT RUN COMPLETED")
    print("=" * 60)
    for r in report["runs"]:
        succ = r["results"].get("success", False)
        print(f"{r['test']:<35}: {'PASS' if succ else 'FAIL'} | Console errors: {len(r['console_errors'])} | HTTP errors: {len(r['http_errors'])}")
    print(f"Report written to: {out_file}")

if __name__ == "__main__":
    main()
