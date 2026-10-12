import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})

        console_logs = []
        page_errors = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        url = "https://virasat-511210.web.app/case/VR-2026-0142/ask-virasat"
        print(f"Navigating to: {url}")
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Find the prompt button "Who can claim the HDFC account?"
        prompt_btn = page.locator('button:has-text("Who can claim the HDFC account?")').first
        if prompt_btn.is_visible():
            print("Clicking suggested prompt...")
            prompt_btn.click()
        else:
            print("Prompt button not found, typing question into input...")
            input_box = page.locator('input[type="text"]').last
            input_box.fill("Who can claim the HDFC account?")
            page.locator('button:has-text("Send")').click()

        print("Waiting 12 seconds for streaming and completion...")
        page.wait_for_timeout(12000)

        body_text = page.locator("body").inner_text()
        print(f"Body text length: {len(body_text)}")
        print(f"Body text preview:\n{body_text[:300]}")

        print("\n--- Console Logs ---")
        for log in console_logs:
            print(log)

        print("\n--- Page Errors ---")
        for err in page_errors:
            print(f"ERROR: {err}")

        # Check if blank
        is_blank = len(body_text.strip()) == 0 or "Something went wrong" in body_text
        print(f"Is blank or crashed: {is_blank}")

        page.screenshot(path="scratch/ask_ai_repro.png")
        print("Screenshot saved to scratch/ask_ai_repro.png")
        browser.close()

if __name__ == "__main__":
    run()
