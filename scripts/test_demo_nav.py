import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    print("1. Opening demo page...")
    page.goto('https://virasat-511210.web.app/demo')
    page.wait_for_timeout(2000)

    print("2. Selecting Judge role...")
    judge_card = page.locator('div[role="button"]:has-text("Judge")')
    print("Judge card count:", judge_card.count())
    judge_card.first.click()
    page.wait_for_timeout(1000)

    print("3. Checking toggle...")
    toggle = page.locator('button[role="switch"]')
    print("Doc toggle visible?", toggle.is_visible())
    if toggle.is_visible():
        print("Toggling Start from documents...")
        toggle.click()
        page.wait_for_timeout(1000)

    print("4. Clicking Enter Demo...")
    enter_btn = page.locator('button:has-text("Enter Demo")')
    print("Enter demo enabled?", enter_btn.is_enabled())
    enter_btn.click()

    page.wait_for_timeout(5000)
    print("New URL after Enter Demo:", page.url)

    browser.close()
    print("Done.")
