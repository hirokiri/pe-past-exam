import { type Dirent, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import type { Question, QuestionMeta } from "./types";

const CONTENT_DIR = join(process.cwd(), "content");

const REQUIRED_FIELDS: (keyof QuestionMeta)[] = [
  "id",
  "exam",
  "examLabel",
  "division",
  "divisionLabel",
  "subject",
  "subjectLabel",
  "year",
  "yearLabel",
  "questionNo",
  "title",
  "status",
];

export function parseQuestionFile(raw: string, path: string): Question {
  const { data, content } = matter(raw);
  for (const field of REQUIRED_FIELDS) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      throw new Error(`${path}: frontmatter に ${field} がありません`);
    }
  }
  return {
    ...(data as QuestionMeta),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: content,
    path,
  };
}

function walkMarkdownFiles(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(e.parentPath, e.name));
}

/** 問題の表示順: 年度降順 → 科目（必須が先） → 問題番号昇順 */
export function compareQuestions(a: QuestionMeta, b: QuestionMeta): number {
  if (a.year !== b.year) return b.year.localeCompare(a.year);
  if (a.subject !== b.subject) {
    if (a.subject === "hisshu") return -1;
    if (b.subject === "hisshu") return 1;
    return a.subject.localeCompare(b.subject);
  }
  return a.questionNo.localeCompare(b.questionNo, "ja", { numeric: true });
}

let cache: Question[] | null = null;

/** content/ 配下の全問題を読み込む（本番はプロセス内キャッシュ） */
export function loadQuestions(): Question[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const questions = walkMarkdownFiles(CONTENT_DIR).map((file) =>
    parseQuestionFile(readFileSync(file, "utf-8"), relative(CONTENT_DIR, file)),
  );
  questions.sort(compareQuestions);
  cache = questions;
  return questions;
}

export function findQuestion(id: string): Question | undefined {
  return loadQuestions().find((q) => q.id === id);
}
