import { describe, expect, test } from "bun:test";
import { segmentQuestionBody } from "../app/lib/markdown.server";

describe("segmentQuestionBody: 小問なし（従来形式）", () => {
  test("問題→模範解答→解説を 引用/自作 の2セグメントに分割できる", () => {
    const md = [
      "## 問題",
      "",
      "問題文です。",
      "",
      "## 模範解答",
      "",
      "模範解答です。",
      "",
      "## 解説",
      "",
      "解説です。",
    ].join("\n");
    const segments = segmentQuestionBody(md);
    expect(segments).not.toBeNull();
    expect(segments).toHaveLength(2);
    expect(segments?.[0]).toEqual({
      quote: true,
      heading: "問題",
      markdown: "問題文です。",
    });
    expect(segments?.[1].quote).toBe(false);
    expect(segments?.[1].markdown).toStartWith("## 模範解答");
    expect(segments?.[1].markdown).toContain("## 解説");
  });

  test("問題セクション内の ### 小見出し・数式・表は引用側に含める", () => {
    const md = [
      "## 問題",
      "",
      "### 設問1",
      "",
      "力 $F = ma$ を求めよ。",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "## 模範解答",
      "",
      "解答。",
    ].join("\n");
    const segments = segmentQuestionBody(md);
    const quote = segments?.[0];
    expect(quote?.quote).toBe(true);
    expect(quote?.markdown).toContain("### 設問1");
    expect(quote?.markdown).toContain("$F = ma$");
    expect(quote?.markdown).toContain("| 1 | 2 |");
    expect(quote?.markdown).not.toContain("## 模範解答");
  });

  test("## 問題 見出しが無い本文は null", () => {
    const md = "## 模範解答\n\n解答のみ。";
    expect(segmentQuestionBody(md)).toBeNull();
  });

  test("問題セクションしか無い本文は引用セグメントのみ", () => {
    const md = "## 問題\n\n問題文のみ。";
    const segments = segmentQuestionBody(md);
    expect(segments).toHaveLength(1);
    expect(segments?.[0]).toEqual({
      quote: true,
      heading: "問題",
      markdown: "問題文のみ。",
    });
  });
});

describe("segmentQuestionBody: 小問あり形式", () => {
  const md = [
    "## 問題",
    "",
    "共通リード文です。",
    "",
    "## 設問（1）",
    "",
    "（1）小問1の問題文です。",
    "",
    "### 模範解答",
    "",
    "答案1です。",
    "",
    "### 解説",
    "",
    "解説1です。",
    "",
    "## 設問（2）",
    "",
    "（2）小問2の問題文です。",
    "",
    "### 模範解答",
    "",
    "答案2です。",
    "",
    "## 全体解説",
    "",
    "### 出題趣旨",
    "",
    "趣旨です。",
  ].join("\n");

  test("リード文と各設問の問題文が引用、模範解答・解説・全体解説が自作になる", () => {
    const segments = segmentQuestionBody(md);
    expect(segments?.map((s) => [s.quote, s.heading])).toEqual([
      [true, "問題"],
      [true, "設問（1）"],
      [false, null],
      [true, "設問（2）"],
      [false, null],
    ]);
    expect(segments?.[1].markdown).toBe("（1）小問1の問題文です。");
    expect(segments?.[2].markdown).toStartWith("### 模範解答");
    expect(segments?.[2].markdown).toContain("### 解説");
    expect(segments?.[3].markdown).toBe("（2）小問2の問題文です。");
    // 全体解説は直前の自作セグメント（設問（2）の模範解答）に結合される
    expect(segments?.[4].markdown).toContain("## 全体解説");
    expect(segments?.[4].markdown).toContain("### 出題趣旨");
  });

  test("引用セグメントに模範解答・解説の本文が混入しない", () => {
    const segments = segmentQuestionBody(md);
    for (const seg of segments ?? []) {
      if (seg.quote) {
        expect(seg.markdown).not.toContain("模範解答");
        expect(seg.markdown).not.toContain("答案");
      }
    }
  });
});
