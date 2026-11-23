"""E2E Browser Verification for Chatbot Rich Text Rendering (Desktop + Mobile)."""

import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("CHAT_TEST_URL", "http://localhost:3002/tra-cuu-ai")
ARTIFACT_DIR = Path(
    os.environ.get(
        "ARTIFACT_DIR",
        str(Path(__file__).resolve().parents[2] / "docs" / "ai-search" / "screenshots"),
    )
)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def verify_viewport(browser, name: str, width: int, height: int) -> dict:
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)

    textarea = page.locator("textarea")
    textarea.wait_for(state="visible", timeout=15000)
    textarea.fill("Các ngày lễ và lịch giỗ họ quan trọng là gì?")
    textarea.press("Enter")

    markdown_box = page.locator('.chat-markdown[data-streaming="false"]').last
    markdown_box.wait_for(state="visible", timeout=25000)

    metrics = page.evaluate(
        """() => {
        const boxes = Array.from(document.querySelectorAll(".chat-markdown"));
        const last = boxes[boxes.length - 1];
        const text = last?.textContent || "";
        const strongTexts = Array.from(last?.querySelectorAll("strong") || []).map((el) =>
          el.textContent?.trim()
        );
        const listItemCount = last?.querySelectorAll("li").length || 0;
        return {
          hasRawAsterisks: text.includes("**") || text.includes("## "),
          strongCount: strongTexts.length,
          strongTexts,
          listItemCount,
          textPreview: text.slice(0, 260),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      }"""
    )

    screenshot_path = ARTIFACT_DIR / f"chat-markdown-{name}.png"
    page.screenshot(path=str(screenshot_path), full_page=False)
    context.close()

    assert not metrics["hasRawAsterisks"], f"[{name}] Còn ký tự Markdown thô: {metrics['textPreview']}"
    assert metrics["strongCount"] > 0, f"[{name}] Không tìm thấy thẻ <strong>"
    assert not metrics["horizontalOverflow"], (
        f"[{name}] Tràn ngang: {metrics['scrollWidth']} > {metrics['innerWidth']}"
    )

    return {"name": name, "screenshotPath": str(screenshot_path), **metrics}


def main():
    headed = "--headed" in sys.argv
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=not headed, slow_mo=200 if headed else 0)
        except Exception:
            browser = p.chromium.launch(channel="msedge", headless=not headed, slow_mo=200 if headed else 0)
        try:
            desktop = verify_viewport(browser, "desktop", 1440, 900)
            mobile = verify_viewport(browser, "mobile", 390, 844)
            print(json.dumps({"ok": True, "desktop": desktop, "mobile": mobile}, ensure_ascii=False, indent=2))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
