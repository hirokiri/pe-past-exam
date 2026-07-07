import { describe, expect, test } from "bun:test";
import { compareQuestions, parseQuestionFile } from "../app/lib/content.server";
import type { QuestionMeta } from "../app/lib/types";

const VALID_MD = `---
id: second-01-r07-hisshu-I-1
exam: second
examLabel: 技術士第二次試験
division: "01"
divisionLabel: 機械部門
subject: hisshu
subjectLabel: 必須科目Ⅰ
year: r07
yearLabel: 令和7年度
questionNo: Ⅰ−1
title: テスト問題
tags: [テスト, サンプル]
sourcePdf: data/pdf/second/01-kikai/r07_hisshu.pdf
status: reviewed
---

## 問題

問題文です。

## 模範解答

模範解答です。

## 解説

解説です。
`;

describe("parseQuestionFile", () => {
  test("frontmatterと本文をパースできる", () => {
    const q = parseQuestionFile(VALID_MD, "second/01-kikai/r07/hisshu/I-1.md");
    expect(q.id).toBe("second-01-r07-hisshu-I-1");
    expect(q.division).toBe("01");
    expect(q.tags).toEqual(["テスト", "サンプル"]);
    expect(q.body).toContain("## 問題");
    expect(q.body).toContain("## 模範解答");
    expect(q.body).toContain("## 解説");
  });

  test("小問あり形式（設問・全体解説）の本文もパースできる", () => {
    const subQuestionBody = `## 問題

共通リード文です。

## 設問（1）

小問(1)の問題文です。

### 模範解答

設問(1)の模範解答です。

### 解説

設問(1)の解説です。

## 設問（2）

小問(2)の問題文です。

### 模範解答

設問(2)の模範解答です。

## 全体解説

### 出題趣旨

全体にわたる解説です。

### 出典・参考文献

- 出典
`;
    const md = VALID_MD.replace(/## 問題[\s\S]*$/, subQuestionBody);
    const q = parseQuestionFile(md, "second/01-kikai/r07/hisshu/I-1.md");
    expect(q.body).toContain("## 設問（1）");
    expect(q.body).toContain("### 模範解答");
    expect(q.body).toContain("## 全体解説");
  });

  test("必須フィールドが欠けているとエラーになる", () => {
    const broken = VALID_MD.replace("title: テスト問題\n", "");
    expect(() => parseQuestionFile(broken, "broken.md")).toThrow(/title/);
  });
});

describe("compareQuestions", () => {
  const base: QuestionMeta = {
    id: "x",
    exam: "second",
    examLabel: "技術士第二次試験",
    division: "01",
    divisionLabel: "機械部門",
    subject: "hisshu",
    subjectLabel: "必須科目Ⅰ",
    year: "r07",
    yearLabel: "令和7年度",
    questionNo: "Ⅰ−1",
    title: "t",
    tags: [],
    status: "draft",
  };

  test("年度の新しい順に並ぶ", () => {
    const r06 = { ...base, year: "r06" };
    expect(compareQuestions(base, r06)).toBeLessThan(0);
    expect(compareQuestions(r06, base)).toBeGreaterThan(0);
  });

  test("同一年度では必須科目が先", () => {
    const sentaku = { ...base, subject: "0103" };
    expect(compareQuestions(base, sentaku)).toBeLessThan(0);
  });

  test("同一科目では問題番号の昇順（数値考慮）", () => {
    const q2 = { ...base, questionNo: "Ⅰ−2" };
    const q10 = { ...base, questionNo: "Ⅰ−10" };
    expect(compareQuestions(base, q2)).toBeLessThan(0);
    expect(compareQuestions(q2, q10)).toBeLessThan(0);
  });
});
