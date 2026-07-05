/**
 * コンテンツMarkdownから部門単位で HTML(webpub) / PDF / EPUB を生成する。
 *
 * 使い方:
 *   bun run scripts/export.ts <divisionSlug> [formats]
 *   例: bun run scripts/export.ts 01-kikai            # pdf,epub,webpub すべて
 *       bun run scripts/export.ts 01-kikai pdf,epub
 *
 * 手順:
 *   1. content/<exam>/<divisionSlug>/ 配下の問題Markdownを収集・整列
 *   2. frontmatter を落として章見出しを付けた原稿を dist/export/<divisionSlug>/manuscript/ に生成
 *   3. vivliostyle.config.cjs を生成し、Vivliostyle CLI でビルド
 *
 * 出力先: dist/export/<divisionSlug>/output/
 * （build/ は react-router build が消すため使わない）
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { compareQuestions, parseQuestionFile } from "../app/lib/content.server";
import type { Question } from "../app/lib/types";

const [divisionSlug, formatArg] = process.argv.slice(2);
if (!divisionSlug) {
  console.error(
    "使い方: bun run scripts/export.ts <divisionSlug> [pdf,epub,webpub]",
  );
  process.exit(1);
}
const formats = (formatArg ?? "pdf,epub,webpub").split(",");

const CONTENT_DIR = join(process.cwd(), "content");
const EXPORT_DIR = join(process.cwd(), "dist", "export", divisionSlug);
const MANUSCRIPT_DIR = join(EXPORT_DIR, "manuscript");

// 1. 対象問題の収集（全試験種別を横断して部門で束ねる）
const files = readdirSync(CONTENT_DIR, { withFileTypes: true, recursive: true })
  .filter((e) => e.isFile() && e.name.endsWith(".md"))
  .map((e) => join(e.parentPath, e.name))
  .filter((path) => relative(CONTENT_DIR, path).split("/")[1] === divisionSlug);

if (files.length === 0) {
  console.error(`content/*/${divisionSlug}/ にコンテンツがありません`);
  process.exit(1);
}

const questions = files.map((file) =>
  parseQuestionFile(readFileSync(file, "utf-8"), relative(CONTENT_DIR, file)),
);
questions.sort(compareQuestions);

const divisionLabel = questions[0].divisionLabel;
const title = `技術士過去問題 模範解答解説集　${divisionLabel}`;

// 2. 原稿の生成
await rm(EXPORT_DIR, { recursive: true, force: true });
await mkdir(MANUSCRIPT_DIR, { recursive: true });

function manuscriptName(q: Question): string {
  return `${q.year}_${q.subject}_${q.path.split("/").at(-1)}`;
}

/** 画像参照（content相対）を原稿ディレクトリ相対へ張り替えつつ画像をコピーする */
async function rewriteImages(
  question: Question,
  body: string,
): Promise<string> {
  const srcDir = join(CONTENT_DIR, question.path, "..");
  let result = body;
  for (const match of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const ref = match[1];
    if (/^(https?:)?\//.test(ref)) continue;
    const src = join(srcDir, ref);
    const dest = join(
      MANUSCRIPT_DIR,
      "images",
      `${question.year}_${question.subject}_${ref.split("/").at(-1)}`,
    );
    if (existsSync(src)) {
      await mkdir(join(dest, ".."), { recursive: true });
      await cp(src, dest);
      result = result.replace(ref, relative(MANUSCRIPT_DIR, dest));
    }
  }
  return result;
}

const entries: { path: string; title: string }[] = [
  { path: "cover.md", title },
];

for (const q of questions) {
  const name = manuscriptName(q);
  const heading = `# ${q.yearLabel}　${q.subjectLabel}　${q.questionNo}\n\n${q.title}\n`;
  const body = await rewriteImages(q, q.body);
  await writeFile(
    join(MANUSCRIPT_DIR, name),
    `---\nmath: true\n---\n\n${heading}\n${body}`,
  );
  entries.push({
    path: name,
    title: `${q.yearLabel} ${q.subjectLabel} ${q.questionNo} ${q.title}`,
  });
}

// 表紙ページ（目次は vivliostyle の toc 生成に任せる）
await writeFile(
  join(MANUSCRIPT_DIR, "cover.md"),
  `# ${title}\n\n本書は技術士試験の過去問題に模範解答と解説を付した私的利用のための解説集です。過去問題の著作権は公益社団法人日本技術士会に帰属します。\n`,
);

// 3. vivliostyle.config.cjs の生成とビルド
const outputs: { path: string; format: string }[] = [];
if (formats.includes("pdf"))
  outputs.push({ path: `output/${divisionSlug}.pdf`, format: "pdf" });
if (formats.includes("epub"))
  outputs.push({ path: `output/${divisionSlug}.epub`, format: "epub" });
if (formats.includes("webpub"))
  outputs.push({ path: `output/${divisionSlug}-html`, format: "webpub" });

const config = `module.exports = ${JSON.stringify(
  {
    title,
    author: "pe-past-exam",
    language: "ja",
    size: "A4",
    entryContext: "./manuscript",
    entry: entries,
    output: outputs,
    workspaceDir: ".vivliostyle",
    toc: { title: "目次", htmlPath: "toc.html", sectionDepth: 1 },
  },
  null,
  2,
)};\n`;
await writeFile(join(EXPORT_DIR, "vivliostyle.config.cjs"), config);

console.log(`${questions.length}問を原稿化しました → ${MANUSCRIPT_DIR}`);
console.log(`フォーマット: ${outputs.map((o) => o.format).join(", ")}`);

// Playwright が未対応のOSでは同梱ブラウザを取得できないため、
// システムにインストール済みのブラウザがあればそれを使う
const systemBrowser = [
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => existsSync(path));

const proc = Bun.spawn(
  [
    "bunx",
    "vivliostyle",
    "build",
    "-c",
    join(EXPORT_DIR, "vivliostyle.config.cjs"),
    ...(systemBrowser ? ["--executable-browser", systemBrowser] : []),
  ],
  { cwd: EXPORT_DIR, stdout: "inherit", stderr: "inherit" },
);
const code = await proc.exited;
if (code !== 0) {
  console.error("vivliostyle build が失敗しました");
  process.exit(code);
}
console.log(`完了: ${join(EXPORT_DIR, "output")}`);
