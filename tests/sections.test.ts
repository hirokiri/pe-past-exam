import { describe, expect, test } from "bun:test";
import { validateSectionStructure } from "../scripts/section-rules";

const LEGACY = `## 問題

問題文です。

## 模範解答

模範解答です。

## 解説

解説です。

### 出典・参考文献

- 出典
`;

const SUBQ = `## 問題

共通リード文です。

## 設問（1）

（1）小問1の問題文です。

### 模範解答

答案1です。

### 解説

解説1です。

## 設問（2）

（2）小問2の問題文です。

### 模範解答

答案2です。

## 全体解説

### 出題趣旨

趣旨です。

### 出典・参考文献

- 出典
`;

describe("validateSectionStructure: 小問なし（従来形式）", () => {
  test("問題→模範解答→解説 の順なら合格", () => {
    expect(validateSectionStructure(LEGACY)).toEqual([]);
  });

  test("模範解答が無いとエラー", () => {
    const errors = validateSectionStructure(
      LEGACY.replace("## 模範解答", "## 解答例"),
    );
    expect(errors.some((e) => e.includes("「## 模範解答」がありません"))).toBe(
      true,
    );
  });

  test("順序が逆だとエラー", () => {
    const swapped = `## 問題\n\n本文。\n\n## 解説\n\n解説。\n\n## 模範解答\n\n答案。\n`;
    expect(
      validateSectionStructure(swapped).some((e) => e.includes("順序が不正")),
    ).toBe(true);
  });

  test("フェンスコードブロック内の見出し風の行は無視される", () => {
    const fenced = LEGACY.replace(
      "解説です。",
      "解説です。\n\n```\n## 設問（1）\n### 模範解答\n```",
    );
    expect(validateSectionStructure(fenced)).toEqual([]);
  });
});

describe("validateSectionStructure: 小問あり形式", () => {
  test("問題→設問（1..n）→全体解説 の構成なら合格", () => {
    expect(validateSectionStructure(SUBQ)).toEqual([]);
  });

  test("設問番号が連番でないとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace("## 設問（2）", "## 設問（3）"),
    );
    expect(errors.some((e) => e.includes("連番ではありません"))).toBe(true);
  });

  test("設問に模範解答が無いとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace("### 模範解答\n\n答案1です。\n\n", ""),
    );
    expect(
      errors.some((e) => e.includes("「設問（1）」には「### 模範解答」が必要")),
    ).toBe(true);
  });

  test("設問の見出し直下に問題文が無いとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace("（1）小問1の問題文です。\n\n", ""),
    );
    expect(errors.some((e) => e.includes("小問の問題文がありません"))).toBe(
      true,
    );
  });

  test("旧形式のH2（模範解答・解説）が混在するとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace("## 全体解説", "## 解説"),
    );
    expect(
      errors.some((e) => e.includes("「## 解説」（H2）は使えません")),
    ).toBe(true);
    expect(errors.some((e) => e.includes("「## 全体解説」で締める必要"))).toBe(
      true,
    );
  });

  test("全体解説が無いとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace(/## 全体解説[\s\S]*$/, ""),
    );
    expect(errors.some((e) => e.includes("「## 全体解説」で締める必要"))).toBe(
      true,
    );
  });

  test("全体解説の後に設問があるとエラー", () => {
    const trailing = `${SUBQ}\n## 設問（3）\n\n（3）小問3。\n\n### 模範解答\n\n答案3。\n`;
    expect(
      validateSectionStructure(trailing).some((e) =>
        e.includes("「## 全体解説」の後にセクション"),
      ),
    ).toBe(true);
  });

  test("全体解説内に ### 模範解答 が紛れ込むとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace("### 出題趣旨", "### 模範解答"),
    );
    expect(
      errors.some((e) =>
        e.includes("「## 全体解説」内に「### 模範解答」は置けません"),
      ),
    ).toBe(true);
  });

  test("設問内に想定外のH3があるとエラー", () => {
    const errors = validateSectionStructure(
      SUBQ.replace(
        "### 解説\n\n解説1です。",
        "### 解説\n\n解説1です。\n\n### 補足\n\n補足。",
      ),
    );
    expect(errors.some((e) => e.includes("「設問（1）」内のH3は"))).toBe(true);
  });
});
