import { describe, expect, test } from "bun:test";
import { filterQuestions, normalize } from "../app/lib/search";
import type { Question } from "../app/lib/types";

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

describe("normalize", () => {
  test("全角英数を半角に、大文字を小文字にする", () => {
    expect(normalize("ＡＢＣ１２３")).toBe("abc123");
  });

  test("日本語はそのまま", () => {
    expect(normalize("機構ダイナミクス")).toBe("機構ダイナミクス");
  });
});

describe("filterQuestions", () => {
  const questions: Question[] = [
    makeQuestion({
      id: "q1",
      year: "r07",
      subject: "hisshu",
      title: "カーボンニュートラル実現に向けた機械技術",
      tags: ["脱炭素"],
      body: "地球温暖化対策について述べよ。",
    }),
    makeQuestion({
      id: "q2",
      year: "r06",
      subject: "0103",
      subjectLabel: "機構ダイナミクス・制御",
      title: "1自由度系の固有振動数",
      tags: ["振動"],
      body: "ばね定数 k の系の固有振動数を求めよ。",
    }),
    makeQuestion({
      id: "q3",
      year: "r07",
      subject: "0103",
      subjectLabel: "機構ダイナミクス・制御",
      division: "02",
      divisionLabel: "船舶・海洋部門",
      title: "フィードバック制御の安定判別",
      tags: ["制御"],
      body: "ナイキスト線図による安定判別を説明せよ。",
    }),
  ];

  test("フィルタなしなら全件返す", () => {
    expect(filterQuestions(questions, {})).toHaveLength(3);
  });

  test("年度で絞り込める", () => {
    const result = filterQuestions(questions, { year: "r07" });
    expect(result.map((q) => q.id)).toEqual(["q1", "q3"]);
  });

  test("部門で絞り込める", () => {
    const result = filterQuestions(questions, { division: "02" });
    expect(result.map((q) => q.id)).toEqual(["q3"]);
  });

  test("科目で絞り込める", () => {
    const result = filterQuestions(questions, { subject: "0103" });
    expect(result.map((q) => q.id)).toEqual(["q2", "q3"]);
  });

  test("キーワードはタイトル・タグ・本文を対象にする", () => {
    expect(
      filterQuestions(questions, { q: "固有振動数" }).map((q) => q.id),
    ).toEqual(["q2"]);
    expect(
      filterQuestions(questions, { q: "脱炭素" }).map((q) => q.id),
    ).toEqual(["q1"]);
    expect(
      filterQuestions(questions, { q: "ナイキスト" }).map((q) => q.id),
    ).toEqual(["q3"]);
  });

  test("複数キーワードはAND条件になる", () => {
    expect(
      filterQuestions(questions, { q: "振動 ばね" }).map((q) => q.id),
    ).toEqual(["q2"]);
    expect(filterQuestions(questions, { q: "振動 制御なし" })).toHaveLength(0);
  });

  test("複合条件で絞り込める", () => {
    const result = filterQuestions(questions, { year: "r07", subject: "0103" });
    expect(result.map((q) => q.id)).toEqual(["q3"]);
  });
});
