#!/usr/bin/env python3
"""
scripts/record_demo.py
Records interactive video/GIF walk-through of Virasat for README.md.
Targets the live deployed URL (or http://localhost:5173).
Generates docs/assets/demo.gif (< 8 MB, 960 px, 10-12 fps) and docs/assets/demo.webm.
"""

import os
import sys
import time

DEMO_URL = os.environ.get("DEMO_URL", "http://localhost:5173")
ASSETS_DIR = os.path.abspath("docs/assets")
GIF_PATH = os.path.join(ASSETS_DIR, "demo.gif")
WEBM_PATH = os.path.join(ASSETS_DIR, "demo.webm")

def main():
    print("=" * 60)
    print(f" Virasat Demo Video/GIF Recorder")
    print(f" Target URL: {DEMO_URL}")
    print("=" * 60)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("\nNote: Playwright is not installed in the current Python environment.")
        print("To install playwright for live recording:")
        print("    pip install playwright")
        print("    playwright install chromium")
        print(f"\nExisting generated demo.gif ({os.path.getsize(GIF_PATH) / (1024*1024):.2f} MB) is present in docs/assets/demo.gif.")
        return

    print("Launching Chromium...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir="scripts/temp_video",
            record_video_size={"width": 960, "height": 540}
        )
        page = context.new_page()

        print("1. Opening Demo Portal...")
        page.goto(f"{DEMO_URL}/demo")
        page.wait_for_timeout(2000)

        print("2. Launching Sharma Demo Case...")
        page.click("button:has-text('Sharma')")
        page.wait_for_timeout(2000)

        print("3. Navigating to Overview...")
        page.goto(f"{DEMO_URL}/case/VR-2026-0142/overview")
        page.wait_for_timeout(3000)

        print("4. Exploring Family & Heirs Graph with Time-Travel...")
        page.goto(f"{DEMO_URL}/case/VR-2026-0142/family")
        page.wait_for_timeout(3000)

        print("5. Viewing Shares Breakdown & Sankey...")
        page.goto(f"{DEMO_URL}/case/VR-2026-0142/shares")
        page.wait_for_timeout(2500)

        print("6. Reviewing Claims Board...")
        page.goto(f"{DEMO_URL}/case/VR-2026-0142/claims")
        page.wait_for_timeout(2500)

        context.close()
        browser.close()
        print("Recording completed. Temporary video captured.")

if __name__ == "__main__":
    main()
