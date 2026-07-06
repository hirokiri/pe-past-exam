// アプリを実ブラウザで操作するドライバ（エージェント用）。
// 使い方:
//   bun .claude/skills/run-pe-past-exam/driver.mjs smoke [baseURL]
//     → トップ→検索→キーワード入力→絞り込み→問題詳細 の一連の操作。
//       各ステップのスクリーンショットを dist/driver-shots/ に保存。
//   bun .claude/skills/run-pe-past-exam/driver.mjs ss <path> <outfile> [baseURL]
//     → 任意ページのスクリーンショット1枚。
// playwright-core は @vivliostyle/cli の推移的依存として node_modules に存在する。
// この OS では Playwright の Chromium ダウンロードが使えないため、
// システムの /usr/bin/google-chrome を executablePath で指定する。
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const [cmd = "smoke", ...rest] = process.argv.slice(2);
const SHOT_DIR = "dist/driver-shots";
mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function shot(name) {
  const file = `${SHOT_DIR}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}

try {
  if (cmd === "ss") {
    const [path = "/", outfile = "page", baseURL = "http://localhost:5173"] =
      rest;
    await page.goto(new URL(path, baseURL).href, { waitUntil: "networkidle" });
    await shot(outfile);
  } else if (cmd === "smoke") {
    const [baseURL = "http://localhost:5173"] = rest;

    // 1. トップページ
    await page.goto(baseURL, { waitUntil: "networkidle" });
    const title = await page.title();
    console.log(`home title: ${title}`);
    await shot("01-home");

    // 2. 検索ページへ遷移
    await page.click('a[href="/questions"]');
    await page.waitForSelector(".question-list li");
    const total = await page.locator(".result-count").textContent();
    console.log(`questions total: ${total}`);
    await shot("02-questions");

    // 3. キーワード検索（フォーム入力 → 送信）
    // React Router のクライアントサイド遷移は URL 変更後に DOM が更新される。
    // URL だけ待つと絞り込み前の件数を読んでしまうので、件数の変化まで待つ。
    await page.fill('input[name="q"]', "振動");
    await page.click('button[type="submit"]');
    await page.waitForURL(/q=/);
    await page.waitForFunction(
      (prev) => document.querySelector(".result-count")?.textContent !== prev,
      total,
    );
    const filtered = await page.locator(".result-count").textContent();
    console.log(`filtered by 振動: ${filtered}`);
    if (filtered === total) throw new Error("filter had no effect");
    await shot("03-search-result");

    // 4. 先頭の問題詳細を開く（問題文・模範解答・解説が描画されるか）
    await page.click(".question-list li a");
    await page.waitForURL(/\/questions\/[^?]+$/);
    await page.waitForSelector("article .question-content");
    const h1 = await page.locator("article h1").first().textContent();
    const sections = await page.locator("h2").allTextContents();
    console.log(`question h1: ${h1}`);
    console.log(`sections: ${sections.join(" / ")}`);
    await shot("04-question-detail");

    if (!(await page.title()).includes("技術士")) {
      throw new Error("detail page title unexpected — flow broken?");
    }
    console.log("SMOKE OK");
  } else {
    console.error(`unknown command: ${cmd} (use: smoke | ss)`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
