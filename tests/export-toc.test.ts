import { describe, expect, test } from "bun:test";
import type { Question } from "../app/lib/types";
import { buildTocHtml } from "../scripts/export-toc";

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: "second-01-r07-hisshu-I-1",
    exam: "second",
    examLabel: "技術士第二次試験",
    division: "01",
    divisionLabel: "機械部門",
    subject: "hisshu",
    subjectLabel: "必須科目Ⅰ",
    year: "r07",
    yearLabel: "令和7年度",
    questionNo: "Ⅰ−1",
    title: "テスト問題",
    tags: [],
    status: "reviewed",
    body: "",
    path: "second/01-kikai/r07/hisshu/I-1.md",
    ...overrides,
  };
}

// compareQuestions 済みの並び（年度降順・必須先行）を模す
const QUESTIONS: Question[] = [
  makeQuestion({ questionNo: "Ⅰ−1", title: "R7必須1" }),
  makeQuestion({ questionNo: "Ⅰ−2", title: "R7必須2" }),
  makeQuestion({
    subject: "0103",
    subjectLabel: "機構ダイナミクス・制御",
    questionNo: "Ⅱ−1−1",
    title: "R7選択1",
  }),
  makeQuestion({
    year: "r06",
    yearLabel: "令和6年度",
    questionNo: "Ⅰ−1",
    title: "R6必須1",
  }),
];

const hrefFor = (q: Question) =>
  `${q.year}_${q.subject}_${q.questionNo}.html#${q.year}_${q.subject}_${q.questionNo}`;

describe("buildTocHtml", () => {
  const html = buildTocHtml(QUESTIONS, { title: "目次", hrefFor });

  test("navが空でない（vivliostyleの自動生成にフォールバックしない）", () => {
    expect(html).toContain('<nav id="toc" role="doc-toc">');
    expect(html).toMatch(/<nav[^>]*>[\s\S]*<ol>[\s\S]*<\/ol>[\s\S]*<\/nav>/);
  });

  test("年度 → 科目 → 問題 の3階層になる", () => {
    // 年度ノードの中に科目ノード、さらにその中に問題リンクがある
    const r7 = html.slice(html.indexOf("令和7年度"), html.indexOf("令和6年度"));
    expect(r7).toContain(">必須科目Ⅰ</a><ol>");
    expect(r7).toContain(">機構ダイナミクス・制御</a><ol>");
    // 3階層 = 年度li > ol > 科目li > ol > 問題li
    expect(html).toMatch(
      /<li><a [^>]*>令和7年度<\/a><ol><li><a [^>]*>必須科目Ⅰ<\/a><ol><li><a /,
    );
  });

  test("入力順（年度降順・必須先行）が保持される", () => {
    const r7 = html.indexOf("令和7年度");
    const r6 = html.indexOf("令和6年度");
    const hisshu = html.indexOf("必須科目Ⅰ");
    const sentaku = html.indexOf("機構ダイナミクス・制御");
    expect(r7).toBeGreaterThan(-1);
    expect(r7).toBeLessThan(r6);
    expect(hisshu).toBeLessThan(sentaku);
  });

  test("全ノードがa[href]で、中間ノードは配下の先頭問題へリンクする", () => {
    // PDFしおりは a[href] のハッシュからしか生成されない（export-toc.ts 冒頭コメント参照）
    expect(html).not.toContain("<span>");
    expect(html).toContain("Ⅰ−1　R7必須1</a>");
    const first = encodeURI(hrefFor(QUESTIONS[0]));
    expect(html).toContain(`<li><a href="${first}">令和7年度</a>`);
    expect(html).toContain(`<a href="${first}">必須科目Ⅰ</a>`);
  });

  test("HTML特殊文字がエスケープされる", () => {
    const escaped = buildTocHtml([makeQuestion({ title: 'A&B <"CD">' })], {
      title: "目次",
      hrefFor,
    });
    expect(escaped).toContain("A&amp;B &lt;&quot;CD&quot;&gt;");
    expect(escaped).not.toContain('<"CD">');
  });
});
