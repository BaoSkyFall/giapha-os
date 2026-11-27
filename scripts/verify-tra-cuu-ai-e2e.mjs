import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  const npmRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  ({ chromium } = require(path.join(npmRoot, "playwright")));
}

const BASE_URL = "http://localhost:3002";
const OUT_DIR = path.resolve("..", "docs", "ai-search", "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 307 || res.status === 308) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  await waitForServer(`${BASE_URL}/tra-cuu-ai`);

  const browser = await chromium.launch({ headless: true });
  const results = {
    redirectOk: false,
    desktop: {},
    mobile: {},
    passed: true,
  };

  try {
    // 1. Desktop 1440x900
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Check /ai-advisor redirect
    await page.goto(`${BASE_URL}/ai-advisor`, { waitUntil: "networkidle" });
    results.redirectOk = page.url().includes("/tra-cuu-ai");

    await page.screenshot({ path: path.join(OUT_DIR, "desktop-welcome.png"), fullPage: false });

    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Send "chào"
    const textarea = page.locator("textarea").first();
    await textarea.fill("chào");
    await textarea.press("Enter");

    // Wait for assistant reply
    await page.waitForSelector("text=Phạm Phú", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);

    const afterChao = await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      const rect = ta ? ta.getBoundingClientRect() : null;
      const footer = document.querySelector("footer");
      return {
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        composerVisible: rect ? rect.top >= 0 && rect.bottom <= window.innerHeight + 2 : false,
        composerBottom: rect ? Math.round(rect.bottom) : null,
        hasUnexpectedFooter: Boolean(footer && footer.getBoundingClientRect().height > 0),
      };
    });

    // Send 8 more messages to build long history & test Gate A scroll
    const queries = [
      "Phạm Phú Thứ là ai?",
      "Cha của Phạm Phú Quốc là ai?",
      "Phạm Phú Thứ và Phạm Phú Quốc có quan hệ gì?",
      "Thống kê gia phả",
      "Chính sách bảo mật",
      "Nhà thờ tộc ở đâu?",
      "Danh sách đời 3",
      "cảm ơn",
    ];

    for (const q of queries) {
      await textarea.fill(q);
      await textarea.press("Enter");
      await page.waitForTimeout(600);
    }

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "desktop-chat.png"), fullPage: false });

    const after20 = await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      const rect = ta ? ta.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        composerVisible: rect ? rect.top >= 0 && rect.bottom <= window.innerHeight + 2 : false,
      };
    });

    // Test scroll up does NOT get forced down & shows "Đến tin nhắn mới" button
    const chatScrollStats = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("div")).find(
        (d) => getComputedStyle(d).overflowY === "auto" && d.scrollHeight > d.clientHeight
      );
      if (!el) return { found: false };
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
      return {
        found: true,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollTopAfterUp: el.scrollTop,
      };
    });
    await page.waitForTimeout(300);
    const jumpBtnVisible = await page.locator("button:has-text('Đến tin nhắn mới')").isVisible().catch(() => false);

    results.desktop = {
      scrollBefore,
      afterChao,
      afterMultiSend: after20,
      chatScrollStats,
      jumpBtnVisible,
    };

    if (
      !results.redirectOk ||
      afterChao.scrollY !== 0 ||
      !afterChao.composerVisible ||
      afterChao.hasUnexpectedFooter ||
      after20.scrollY !== 0 ||
      !after20.composerVisible
    ) {
      results.passed = false;
    }

    await context.close();

    // 2. Mobile 390x844
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mPage = await mobileCtx.newPage();
    await mPage.goto(`${BASE_URL}/tra-cuu-ai`, { waitUntil: "networkidle" });
    const mTextarea = mPage.locator("textarea").first();
    await mTextarea.fill("chào");
    await mTextarea.press("Enter");
    await mPage.waitForTimeout(1000);
    await mPage.screenshot({ path: path.join(OUT_DIR, "mobile-chat.png"), fullPage: false });

    const mobileCheck = await mPage.evaluate(() => {
      const ta = document.querySelector("textarea");
      const rect = ta ? ta.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        composerVisible: rect ? rect.top >= 0 && rect.bottom <= window.innerHeight + 2 : false,
      };
    });
    results.mobile = mobileCheck;
    if (mobileCheck.scrollY !== 0 || mobileCheck.horizontalOverflow || !mobileCheck.composerVisible) {
      results.passed = false;
    }
    await mobileCtx.close();
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  if (!results.passed) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
