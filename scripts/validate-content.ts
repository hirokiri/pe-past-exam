/**
 * content/ 配下のコンテンツMarkdownを検証する。
 * - frontmatter 必須項目（content.server.ts と同一基準）
 * - id がファイルパスと整合していること
 * - 本文のセクション構成が正しいこと（判定ルールは section-rules.ts）
 *   - 小問なし: 「問題 → 模範解答 → 解説」の順
 *   - 小問あり: 「問題 → 設問（1..n）（各設問内は 模範解答 → 解説） → 全体解説」の順
 * - status が定義済みの値であること
 * - answered/reviewed の場合は「出典・参考文献」があり TODO が残っていないこと
 *
 * 使い方: bun run scripts/validate-content.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseQuestionFile } from "../app/lib/content.server";
import type { Question } from "../app/lib/types";
import { validateSectionStructure } from "./section-rules";

const CONTENT_DIR = join(process.cwd(), "content");
const STATUSES = ["draft", "transcribed", "answered", "reviewed"];

const errors: string[] = [];

function validate(question: Question, file: string): void {
  const fail = (msg: string) => errors.push(`${file}: ${msg}`);

  // id とパスの整合（content/<exam>/<divSlug>/<year>/<subject>/<no>.md）
  const parts = file.split(sep);
  if (parts.length === 5) {
    const [exam, divSlug, year, subject, filename] = parts;
    const no = filename.replace(/\.md$/, "");
    const expectedId = `${exam}-${divSlug.split("-")[0]}-${year}-${subject}-${no}`;
    if (question.id !== expectedId) {
      fail(
        `id "${question.id}" がパスから導かれる "${expectedId}" と一致しません`,
      );
    }
  } else {
    fail(
      "パスが content/<exam>/<division>/<year>/<subject>/<questionNo>.md の形式ではありません",
    );
  }

  if (!STATUSES.includes(question.status)) {
    fail(`status "${question.status}" は不正です（${STATUSES.join(" | ")}）`);
  }

  for (const message of validateSectionStructure(question.body)) {
    fail(message);
  }

  if (question.status === "answered" || question.status === "reviewed") {
    if (!question.body.includes("出典・参考文献")) {
      fail("「出典・参考文献」がありません（answered 以降は必須）");
    }
    if (question.body.includes("TODO") || question.title.includes("TODO")) {
      fail("TODO が残っています（answered 以降は不可）");
    }
  }
}

let files: string[] = [];
try {
  files = readdirSync(CONTENT_DIR, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => relative(CONTENT_DIR, join(e.parentPath, e.name)));
} catch {
  console.log("content/ がありません（コンテンツ0件）");
  process.exit(0);
}

const seenIds = new Set<string>();
for (const file of files) {
  try {
    const question = parseQuestionFile(
      readFileSync(join(CONTENT_DIR, file), "utf-8"),
      file,
    );
    if (seenIds.has(question.id)) {
      errors.push(`${file}: id "${question.id}" が重複しています`);
    }
    seenIds.add(question.id);
    validate(question, file);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
}

if (errors.length > 0) {
  console.error(`NG: ${errors.length}件のエラー`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}
console.log(`OK: ${files.length}件のコンテンツを検証しました`);
