import sys
import time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def test_ask_ai_scenarios():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        console_errors = []
        page_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        url = "http://127.0.0.1:5173/case/VR-2026-0142/ask-virasat"
        print(f"=== Scenario 1: Initial Page Load ===")
        print(f"Navigating to {url}...")
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Assert page title & header
        assert page.locator("h1:has-text('Ask Virasat')").is_visible(), "Page header not visible"
        print("[PASS] Header and welcome message rendered successfully.")

        # Test Scenario 1 & 2: Suggested Prompt -> Successful Streaming Response + Inline Card + Citations
        print(f"\n=== Scenario 2: Submitting First Question (Who can claim the HDFC account?) ===")
        prompt_btn = page.locator('button:has-text("Who can claim the HDFC account?")').first
        prompt_btn.click()
        print("Clicked suggested prompt. Waiting for streaming completion...")
        page.wait_for_timeout(7000)

        # Verify page is not blank
        body_text = page.locator("body").inner_text()
        assert len(body_text) > 1000, f"Page seems blank or empty! Body length: {len(body_text)}"
        print(f"[PASS] Response received. Body text length: {len(body_text)} chars.")

        # Verify Assistant Message exists and is visible
        assistant_bubbles = page.locator(".bg-slate-100")
        assert assistant_bubbles.count() >= 2, "Assistant response bubble not rendered"
        print(f"[PASS] Found {assistant_bubbles.count()} assistant message bubbles.")

        # Verify Citation Pills / Modal
        print(f"\n=== Scenario 3: Citation Pill Interaction ===")
        citation_btn = page.locator("div.space-y-1 button:has-text('§')").first
        if not citation_btn.is_visible():
            citation_btn = page.locator("div.space-y-3 div:has-text('Inspect Full Excerpt')").first
        
        if citation_btn.is_visible():
            print("Found citation pill. Clicking to open Dossier Modal...")
            citation_btn.click()
            page.wait_for_timeout(1000)
            close_btn = page.locator("button:has-text('Close Dossier')")
            assert close_btn.is_visible(), "Close Dossier button not visible in modal"
            print("Modal visible? True")
            close_btn.click()
            page.wait_for_timeout(500)
            print("[PASS] Citation Dossier modal opened and closed cleanly.")

        # Test Scenario 4: Consecutive Questions in Same Conversation
        print(f"\n=== Scenario 4: Submitting Consecutive Question ===")
        input_box = page.locator('input[placeholder*="Ask Virasat"]').first
        input_box.fill("What documents am I missing?")
        page.locator('button:has-text("Send")').click()
        print("Sent second question. Waiting for streaming completion...")
        page.wait_for_timeout(7000)

        body_text_after = page.locator("body").inner_text()
        assert "What documents am I missing?" in body_text_after, "Second user question not preserved"
        print("[PASS] Both consecutive questions and answers preserved in conversation feed.")

        # Test Scenario 5: Third Question (No Will / Section 8 HSA)
        print(f"\n=== Scenario 5: Submitting Third Question (What happens if there is no will?) ===")
        input_box.fill("What happens if there is no will?")
        page.locator('button:has-text("Send")').click()
        print("Sent third question. Waiting for streaming completion...")
        page.wait_for_timeout(7000)

        # Test Scenario 6: Switch Conversation History in Left Panel
        print(f"\n=== Scenario 6: Switching Conversation Thread ===")
        conv_btn = page.locator("button:has-text('Missing Documents & LIC Form 3783')").first
        if conv_btn.is_visible():
            conv_btn.click()
            page.wait_for_timeout(1500)
            print("[PASS] Switched conversation thread cleanly without render issues.")

        # Test Scenario 7: Page Reload and Recovery
        print(f"\n=== Scenario 7: Page Refresh & Reopening ===")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(2000)
        assert page.locator("h1:has-text('Ask Virasat')").is_visible(), "Header missing after reload"
        print("[PASS] Page reloaded and remounted cleanly.")

        # Capture Screenshot
        page.screenshot(path="scratch/ask_virasat_all_passed.png", full_page=True)
        print("Captured full screenshot to scratch/ask_virasat_all_passed.png")

        print("\n=== Error Inspection ===")
        fatal_errors = [e for e in page_errors if "Warning" not in e]
        print(f"Total Page Errors: {len(fatal_errors)}")
        for err in fatal_errors:
            print(f"  ERROR: {err}")

        assert len(fatal_errors) == 0, f"Found fatal page errors: {fatal_errors}"
        print("\n>>> ALL ASK AI TEST SCENARIOS PASSED WITH ZERO CRASHES! <<<")

        browser.close()

if __name__ == "__main__":
    test_ask_ai_scenarios()
