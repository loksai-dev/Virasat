import sys
import time
from playwright.sync_api import sync_playwright

def test_flow():
    print("Testing Playwright navigation on https://virasat-511210.web.app ...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
        )
        page = context.new_page()

        print("1. Opening landing page...")
        page.goto("https://virasat-511210.web.app", timeout=30000)
        page.wait_for_load_state("networkidle")
        print("Landing title:", page.title())

        print("2. Navigating to demo...")
        page.goto("https://virasat-511210.web.app/demo", timeout=30000)
        page.wait_for_load_state("networkidle")
        print("Demo page URL:", page.url)

        # Check for role buttons
        judge_btn = page.locator("button:has-text('Judge')")
        print("Judge button visible?", judge_btn.is_visible())
        if judge_btn.is_visible():
            judge_btn.click()
            time.sleep(1)

        # Check for start from documents toggle
        doc_toggle = page.locator("button[role='switch']")
        print("Doc toggle visible?", doc_toggle.is_visible())

        # Check Enter Demo button
        enter_btn = page.locator("button:has-text('Enter Demo')")
        print("Enter demo button visible?", enter_btn.is_visible())

        browser.close()
        print("Test passed successfully.")

if __name__ == "__main__":
    test_flow()
