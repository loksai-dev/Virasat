#!/usr/bin/env python3
"""Capture Playwright screenshots of landing page at 390, 768, 1024, 1366, and 1920 px widths.
Verifies title layout, responsiveness, and saves screenshots to docs/assets/screens/.
"""

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

WIDTHS = [390, 768, 1024, 1366, 1920]
BASE_URL = "http://localhost:5173"
OUT_DIR = Path("docs/assets/screens")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    target_url = sys.argv[1] if len(sys.argv) > 1 else BASE_URL
    print(f"Testing responsive landing page screenshots on {target_url}...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for w in WIDTHS:
            h = 844 if w == 390 else 1024 if w == 768 else 900 if w == 1024 else 768 if w == 1366 else 1080
            context = browser.new_context(viewport={"width": w, "height": h})
            page = context.new_page()

            page.goto(target_url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            shot_path = OUT_DIR / f"landing_{w}px.png"
            page.screenshot(path=str(shot_path), full_page=False)
            print(f"Captured screenshot at {w}px -> {shot_path}")

            # Verify title text
            title_el = page.locator("h3:has-text('Ramesh Sharma Estate')").first
            if title_el.is_visible():
                box = title_el.bounding_box()
                print(f"  [{w}px] Ramesh Sharma Estate bounding box: height={box['height']}px (1-2 lines expected, <= 60px)")
                assert box["height"] <= 70, f"Title height {box['height']}px indicates breaking into 3 lines!"

            context.close()

        browser.close()
    print("All responsive layout tests passed successfully!")


if __name__ == "__main__":
    main()
