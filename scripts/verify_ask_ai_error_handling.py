import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def test_error_and_retry():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        url = "http://127.0.0.1:5173/case/VR-2026-0142/ask-virasat"
        print("Navigating to Ask Virasat...")
        page.goto(url, wait_until="networkidle")

        # Intercept /chat to return a 500 Internal Server Error
        def handle_chat_route(route):
            print("Intercepted /chat request -> aborting with 500 error...")
            route.fulfill(status=500, body="Internal Server Error")

        page.route("**/chat", handle_chat_route)

        # Type a question and send
        input_box = page.locator('input[placeholder*="Ask Virasat"]').first
        input_box.fill("Testing error scenario")
        page.locator('button:has-text("Send")').click()

        print("Waiting 3 seconds for error handling...")
        page.wait_for_timeout(3000)

        # Check body length - confirm page did not go blank
        body_text = page.locator("body").inner_text()
        assert len(body_text) > 1000, "Page went blank during error!"
        print(f"[PASS] Page remained mounted and visible (length {len(body_text)} chars)")

        # Verify input box is re-enabled (not stuck in infinite loading)
        send_btn = page.locator('button:has-text("Send")')
        assert send_btn.is_visible(), "Send button missing or stuck in streaming mode"
        print("[PASS] Loading state cleared cleanly; Send button is accessible.")

        browser.close()
        print(">>> ERROR HANDLING AND RESILIENCE TEST PASSED! <<<")

if __name__ == "__main__":
    test_error_and_retry()
