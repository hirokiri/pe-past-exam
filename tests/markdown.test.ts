import { describe, expect, test } from "bun:test";
import { splitQuestionBody } from "../app/lib/markdown.server";

describe("splitQuestionBody", () => {
  test("問題→模範解答→解説の標準構成を分割できる", () => {
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
    const result = splitQuestionBody(md);
    expect(result).not.toBeNull();
    expect(result?.question).toBe("問題文です。");
    expect(result?.rest).toStartWith("## 模範解答");
    expect(result?.rest).toContain("## 解説");
  });

  test("問題セクション内の ### 小見出し・数式・表は question 側に含める", () => {
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
    const result = splitQuestionBody(md);
    expect(result?.question).toContain("### 設問1");
    expect(result?.question).toContain("$F = ma$");
    expect(result?.question).toContain("| 1 | 2 |");
    expect(result?.question).not.toContain("## 模範解答");
    expect(result?.rest).toStartWith("## 模範解答");
  });

  test("## 問題 見出しが無い本文は null", () => {
    const md = "## 模範解答\n\n解答のみ。";
    expect(splitQuestionBody(md)).toBeNull();
  });

  test("問題セクションしか無い本文は rest が空文字列", () => {
    const md = "## 問題\n\n問題文のみ。";
    const result = splitQuestionBody(md);
    expect(result?.question).toBe("問題文のみ。");
    expect(result?.rest).toBe("");
  });
});
