#!/usr/bin/env python3
"""
scripts/record_demo.py
Automated Playwright 1080p Screen Recording for Virasat AI Builder Cup Demo.
Targets the live deployed product: https://virasat-511210.web.app
Records the full interactive journey per docs/submission/video/script.md:
  1. Landing page & hero tagline
  2. Demo portal: Judge role, Sharma estate, "Start from documents" toggle, Enter Demo
  3. Real-time Autonomous Agent Mesh execution on Spanner & Vertex AI
  4. Overview Dashboard (12 asset folios, ₹2.84 Cr, 45d settlement)
  5. Family Kinship Graph & Time-Travel Slider (HDFC nominee dispute story, bi-temporal toggle)
  6. Assets folio & Nominee update (SEBI/Banking mandate recalculation)
  7. Deterministic Legal Shares (Sankey flow, with-will vs without-will toggle, statutory citations)
  8. Claims Tracker (SBI claim packet preview)
  9. Dispute Guard (planted affidavit conflict intercepted)
  10. Ask Virasat (multilingual legal AI in Hindi/Telugu)

Outputs: docs/submission/video/raw/demo_recording.webm
"""

import os
import sys
import time
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

import sys
sys.stdout.reconfigure(line_buffering=True)

BASE_URL = os.environ.get("DEMO_URL", "https://virasat-511210.web.app")
RAW_DIR = Path("docs/submission/video/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

CURSOR_SCRIPT = """
(() => {
    if (document.getElementById('playwright-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'playwright-cursor';
    cursor.style.position = 'fixed';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.borderRadius = '50%';
    cursor.style.backgroundColor = 'rgba(20, 184, 166, 0.6)';
    cursor.style.border = '2px solid #0B1F3A';
    cursor.style.boxShadow = '0 0 10px rgba(20, 184, 166, 0.5)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '2147483647';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.transition = 'transform 0.08s ease, background-color 0.12s ease';
    document.body.appendChild(cursor);

    window.__cursorX = 960;
    window.__cursorY = 540;
    cursor.style.left = '960px';
    cursor.style.top = '540px';

    window.addEventListener('mousemove', e => {
        window.__cursorX = e.clientX;
        window.__cursorY = e.clientY;
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }, { passive: true });

    window.addEventListener('mousedown', () => {
        cursor.style.backgroundColor = 'rgba(201, 162, 39, 0.9)';
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }, { passive: true });

    window.addEventListener('mouseup', () => {
        cursor.style.backgroundColor = 'rgba(20, 184, 166, 0.6)';
        cursor.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }, { passive: true });
})();
"""

def inject_cursor(page):
    try:
        page.evaluate(CURSOR_SCRIPT)
    except Exception:
        pass

def smooth_move(page, target_x, target_y, steps=12, pause=0.015):
    inject_cursor(page)
    try:
        pos = page.evaluate("() => ({ x: window.__cursorX || 960, y: window.__cursorY || 540 })")
        cur_x, cur_y = pos.get('x', 960), pos.get('y', 540)
    except Exception:
        cur_x, cur_y = 960, 540

    for i in range(1, steps + 1):
        x = cur_x + (target_x - cur_x) * (i / steps)
        y = cur_y + (target_y - cur_y) * (i / steps)
        page.mouse.move(x, y)
        time.sleep(pause)

def click_locator(page, locator, wait_after=1.0):
    inject_cursor(page)
    try:
        box = locator.bounding_box(timeout=3000)
        if box:
            target_x = box['x'] + box['width'] / 2
            target_y = box['y'] + box['height'] / 2
            smooth_move(page, target_x, target_y)
            page.mouse.down()
            time.sleep(0.1)
            page.mouse.up()
        else:
            locator.click(timeout=3000)
    except Exception as e:
        print(f"    [click fallback: {e}]", flush=True)
        try:
            locator.click(timeout=3000)
        except Exception:
            pass
    time.sleep(wait_after)

def record():
    print("=" * 60)
    print(" Virasat Automated Screen Recorder (1080p Playwright)")
    print(f" Target URL: {BASE_URL}")
    print(f" Output Directory: {RAW_DIR}")
    print("=" * 60)

    # Clean existing webm in raw dir
    for f in RAW_DIR.glob("*.webm"):
        f.unlink()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            record_video_dir=str(RAW_DIR),
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        # -------------------------------------------------------------
        # 1. LANDING PAGE (Hero, tagline, scroll, explore button)
        # -------------------------------------------------------------
        print("\n[SCENE 1] Loading Landing Page...")
        page.goto(BASE_URL, timeout=30000)
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.0)

        # Smooth hover over hero
        smooth_move(page, 960, 420, steps=20)
        time.sleep(2.0)

        # Gentle scroll to reveal autonomous mesh & telemetry
        print("  Scrolling to view feature overview...")
        page.mouse.wheel(0, 600)
        time.sleep(2.5)
        page.mouse.wheel(0, -600)
        time.sleep(1.5)

        # Click Explore Demo
        print("  Navigating to Demo portal...")
        demo_btn = page.locator("a[href='/demo'], button:has-text('Explore Live Demo'), button:has-text('Enter Demo')").first
        if demo_btn.is_visible():
            click_locator(page, demo_btn, wait_after=2.0)
        else:
            page.goto(f"{BASE_URL}/demo")
            time.sleep(2.0)

        # -------------------------------------------------------------
        # 2. DEMO EXPERIENCE PORTAL (Judge Role + Start from documents)
        # -------------------------------------------------------------
        print("\n[SCENE 2] Demo Experience Portal...")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(1.5)

        # Click Judge role card
        print("  Selecting Judicial Officer Perspective...")
        judge_card = page.locator('div[role="button"]:has-text("Judge")').first
        click_locator(page, judge_card, wait_after=1.5)

        # Verify Sharma scenario is selected
        sharma_scenario = page.locator('button:has-text("Complex (Sharma)")').first
        if sharma_scenario.is_visible():
            click_locator(page, sharma_scenario, wait_after=1.0)

        # Toggle "Start from documents"
        print("  Enabling 'Start from documents' (Live Discovery Mode)...")
        doc_toggle = page.locator("button[role='switch']").first
        if doc_toggle.is_visible():
            click_locator(page, doc_toggle, wait_after=1.5)

        # Click Enter Demo
        print("  Launching isolated demo session...")
        enter_demo_btn = page.locator("button:has-text('Enter Demo')").first
        click_locator(page, enter_demo_btn, wait_after=4.0)

        # Wait for navigation to /agents or /case/
        print("  Waiting for session initiation...")
        case_id = "VR-2026-0142"
        for _ in range(40):
            if "/case/" in page.url:
                current_case_url = page.url
                parts = current_case_url.split("/case/")
                case_id = parts[1].split("/")[0]
                break
            time.sleep(0.5)

        print(f"  Active Session Case ID: {case_id}")
        if "/agents" not in page.url:
            page.goto(f"{BASE_URL}/case/{case_id}/agents")
            page.wait_for_load_state("networkidle")
        else:
            time.sleep(1.0)

        # -------------------------------------------------------------
        # 3. AUTONOMOUS AGENT MESH EXECUTION
        # -------------------------------------------------------------
        print("\n[SCENE 3] Recording Agent Mesh Execution...")
        inject_cursor(page)
        time.sleep(2.0)

        # Close tour modal if visible
        tour_close = page.locator("button:has-text('✕'), button:has-text('Skip wait')").first
        if tour_close.is_visible():
            click_locator(page, tour_close, wait_after=1.0)

        # Hover over agent telemetry cards
        smooth_move(page, 450, 380, steps=20)
        time.sleep(2.5)
        smooth_move(page, 1100, 480, steps=20)
        time.sleep(3.0)

        # Check for Run Complete or Fast-forward
        ff_btn = page.locator("button:has-text('Fast-forward'), button:has-text('Skip wait')").first
        if ff_btn.is_visible():
            print("  Advancing agents pipeline to final state...")
            click_locator(page, ff_btn, wait_after=2.0)

        time.sleep(3.0)

        # -------------------------------------------------------------
        # 4. SETTLEMENT OVERVIEW DASHBOARD
        # -------------------------------------------------------------
        print("\n[SCENE 4] Overview Dashboard...")
        page.goto(f"{BASE_URL}/case/{case_id}/overview")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Smooth hover over top metric cards (₹2.84 Cr, 12 Folios, 45 Days)
        smooth_move(page, 320, 220, steps=15)
        time.sleep(1.5)
        smooth_move(page, 720, 220, steps=15)
        time.sleep(1.5)
        smooth_move(page, 1120, 220, steps=15)
        time.sleep(1.5)

        # Scroll down to view institutional reconciliation table
        page.mouse.wheel(0, 400)
        time.sleep(2.0)
        page.mouse.wheel(0, -400)
        time.sleep(1.0)

        # -------------------------------------------------------------
        # 5. KINSHIP GRAPH & TIME-TRAVEL SLIDER
        # -------------------------------------------------------------
        print("\n[SCENE 5] Family Kinship Graph & Time-Travel Slider...")
        page.goto(f"{BASE_URL}/case/{case_id}/heirs")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Hover over time travel slider
        slider = page.locator("input[type='range']").first
        if slider.is_visible():
            print("  Dragging Time-Travel Slider (2018 -> 2022 -> 2026)...")
            slider_box = slider.bounding_box()
            if slider_box:
                # Click left side (2018 Pre-Nomination)
                smooth_move(page, slider_box['x'] + 10, slider_box['y'] + 5)
                page.mouse.click(slider_box['x'] + 10, slider_box['y'] + 5)
                time.sleep(2.0)

                # Click middle (2022 SEBI Demat Updated)
                page.mouse.click(slider_box['x'] + slider_box['width'] * 0.4, slider_box['y'] + 5)
                time.sleep(2.0)

                # Click right (2026 Intestate Current)
                page.mouse.click(slider_box['x'] + slider_box['width'] - 5, slider_box['y'] + 5)
                time.sleep(2.0)

        # Click bi-temporal toggle "As it was true" vs "As we knew it"
        print("  Toggling Bi-Temporal Perspective...")
        toggle_btn = page.locator("button:has-text('As we knew it')").first
        if toggle_btn.is_visible():
            click_locator(page, toggle_btn, wait_after=2.0)
        toggle_true_btn = page.locator("button:has-text('As it was true')").first
        if toggle_true_btn.is_visible():
            click_locator(page, toggle_true_btn, wait_after=2.0)

        # Hover on HDFC node or right inspector panel
        smooth_move(page, 1500, 320, steps=15)
        time.sleep(2.0)

        # -------------------------------------------------------------
        # 6. ASSETS FOLIO & NOMINEE ADJUSTMENT
        # -------------------------------------------------------------
        print("\n[SCENE 6] Assets Folio & Nominee Adjustment...")
        page.goto(f"{BASE_URL}/case/{case_id}/assets")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.0)

        # Click HDFC Savings Account row/card to open drawer
        hdfc_row = page.locator("text='HDFC'").first
        if hdfc_row.is_visible():
            print("  Opening HDFC Folio details drawer...")
            click_locator(page, hdfc_row, wait_after=2.0)

            # Look for "Save Nominees" or nominee inputs
            save_nom_btn = page.locator("button:has-text('Save Nominees')").first
            if save_nom_btn.is_visible():
                print("  Saving 100% verified nominee allocation...")
                click_locator(page, save_nom_btn, wait_after=2.0)

        # -------------------------------------------------------------
        # 7. DETERMINISTIC HEIR SHARES & STATUTORY CITATIONS
        # -------------------------------------------------------------
        print("\n[SCENE 7] Heir Shares & Statutory Citations...")
        page.goto(f"{BASE_URL}/case/{case_id}/heirs/shares")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Hover over Sankey flow
        smooth_move(page, 520, 420, steps=20)
        time.sleep(2.0)

        # Toggle "With Will" vs "Without Will"
        will_toggle = page.locator("button:has-text('With Will'), label:has-text('With Will')").first
        if will_toggle.is_visible():
            print("  Toggling With-Will vs Without-Will...")
            click_locator(page, will_toggle, wait_after=2.0)
            without_will = page.locator("button:has-text('Without Will'), label:has-text('Without Will')").first
            if without_will.is_visible():
                click_locator(page, without_will, wait_after=2.0)

        # Scroll to statutory citations
        page.mouse.wheel(0, 400)
        time.sleep(2.0)
        page.mouse.wheel(0, -400)
        time.sleep(1.0)

        # -------------------------------------------------------------
        # 8. CLAIMS TRACKER & PACKET
        # -------------------------------------------------------------
        print("\n[SCENE 8] Claims Board & Claim Packet...")
        page.goto(f"{BASE_URL}/case/{case_id}/claims")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Click SBI Savings Bank claim card to expand packet
        sbi_claim = page.locator("text='State Bank of India', text='SBI'").first
        if sbi_claim.is_visible():
            print("  Expanding SBI Claim Packet...")
            click_locator(page, sbi_claim, wait_after=2.0)

        time.sleep(2.0)

        # -------------------------------------------------------------
        # 9. DISPUTE GUARD & FRAUD SHIELD
        # -------------------------------------------------------------
        print("\n[SCENE 9] Dispute Guard & Fraud Shield...")
        page.goto(f"{BASE_URL}/case/{case_id}/disputes")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Hover over planted caveat defense card
        smooth_move(page, 720, 360, steps=20)
        time.sleep(2.5)

        # -------------------------------------------------------------
        # 10. ASK VIRASAT (MULTILINGUAL LEGAL ASSISTANT)
        # -------------------------------------------------------------
        print("\n[SCENE 10] Multilingual Ask Virasat...")
        page.goto(f"{BASE_URL}/case/{case_id}/ask")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(2.5)

        # Look for question input
        chat_input = page.locator("textarea, input[type='text']").first
        if chat_input.is_visible():
            click_locator(page, chat_input, wait_after=0.5)
            # Type Hindi legal question
            chat_input.fill("बिना वसीयत के संपत्ति का बंटवारा हिंदू उत्तराधिकार कानून के तहत कैसे होगा?")
            time.sleep(1.0)
            send_btn = page.locator("button:has-text('Send'), button:has-text('Ask'), button[type='submit']").first
            if send_btn.is_visible():
                click_locator(page, send_btn, wait_after=4.0)

        time.sleep(2.0)

        # Close page and context to flush recording
        print("\nFlushing video stream...")
        page.close()
        context.close()
        browser.close()

    # Locate generated webm file
    webm_files = list(RAW_DIR.glob("*.webm"))
    if not webm_files:
        raise RuntimeError("No recording found in docs/submission/video/raw!")

    # Rename newest to demo_recording.webm
    latest_webm = max(webm_files, key=os.path.getmtime)
    final_raw = RAW_DIR / "demo_recording.webm"
    if latest_webm != final_raw:
        if final_raw.exists():
            final_raw.unlink()
        latest_webm.rename(final_raw)

    print("=" * 60)
    print(f" RECORDING COMPLETE: {final_raw}")
    print(f" Size: {final_raw.stat().st_size / (1024*1024):.2f} MB")
    print("=" * 60)

if __name__ == "__main__":
    record()
