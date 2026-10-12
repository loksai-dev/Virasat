import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    url = "https://virasat-511210.web.app/demo"
    page.goto(url)
    page.wait_for_timeout(2000)

    # Click Judge
    page.locator('div[role="button"]:has-text("Judge")').first.click()
    page.wait_for_timeout(500)

    # Click Doc toggle
    page.locator('button[role="switch"]').click()
    page.wait_for_timeout(500)

    # Enter Demo
    page.locator('button:has-text("Enter Demo")').click()
    page.wait_for_url("**/agents*", timeout=15000)
    print("Navigated to agents page:", page.url)

    page.wait_for_timeout(3000)
    buttons = [b.inner_text().strip() for b in page.locator('button').all() if b.inner_text().strip()]
    print("Agents page buttons:", buttons)

    # Look for launch button or run status
    launch_btn = page.locator('button:has-text("Launch")')
    print("Launch button visible?", launch_btn.is_visible())

    browser.close()
    print("Test agents page completed.")
