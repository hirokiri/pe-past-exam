/**
 * コンテンツ本文のセクション構成検証（validate-content.ts と単体テストから使う）。
 *
 * 2形式を判別して検証する:
 * - 小問なし（従来形式）: 問題 → 模範解答 → 解説 の順
 * - 小問あり: 問題 → 設問（1..n）（各設問内は 模範解答 →（任意で）解説） → 全体解説
 *
 * 見出しの抽出はフェンスコードブロック（``` / ~~~）内を除外する。
 */

export const SUBQUESTION_HEADING = /^## 設問（(\d+)）$/;

const LEGACY_SECTION_ORDER = ["## 問題", "## 模範解答", "## 解説"];

interface Section {
  heading: string;
  /** 見出し直下〜次のH2/H3までに空行以外の本文があるか */
  hasBody: boolean;
  /** このH2セクション内のH3見出し（順序どおり） */
  subheadings: string[];
}

/** フェンスコードブロック内を空行に置換した行配列を返す */
function contentLines(body: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      lines.push("");
      continue;
    }
    lines.push(inFence ? "" : line);
  }
  return lines;
}

/** H2ごとにセクションへ分割する（最初のH2より前は無視） */
function splitSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  let afterHeading = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { heading: line, hasBody: false, subheadings: [] };
      sections.push(current);
      afterHeading = true;
      continue;
    }
    if (!current) continue;
    if (line.startsWith("### ")) {
      current.subheadings.push(line);
      afterHeading = false;
      continue;
    }
    if (afterHeading && line.trim() !== "") {
      current.hasBody = true;
    }
  }
  return sections;
}

/** 本文のセクション構成を検証し、エラーメッセージの配列を返す（空なら合格） */
export function validateSectionStructure(body: string): string[] {
  const sections = splitSections(contentLines(body));
  const isSubQuestionForm = sections.some((s) =>
    SUBQUESTION_HEADING.test(s.heading),
  );
  return isSubQuestionForm
    ? validateSubQuestionForm(sections)
    : validateLegacyForm(sections);
}

/** 従来形式: 問題 → 模範解答 → 解説 がこの順で存在すること */
function validateLegacyForm(sections: Section[]): string[] {
  const errors: string[] = [];
  const headings = sections.map((s) => s.heading);
  let cursor = -1;
  for (const section of LEGACY_SECTION_ORDER) {
    const idx = headings.indexOf(section);
    if (idx < 0) {
      errors.push(`セクション「${section}」がありません`);
      continue;
    }
    if (idx < cursor) {
      errors.push(
        `セクション「${section}」の順序が不正です（問題→模範解答→解説）`,
      );
    }
    cursor = idx;
  }
  return errors;
}

/**
 * 小問あり形式: H2列が「問題 → 設問（1..n）連番 → 全体解説」と完全一致し、
 * 各設問は問題文の本文を持ち、H3が「模範解答 →（任意で）解説」であること。
 */
function validateSubQuestionForm(sections: Section[]): string[] {
  const errors: string[] = [];

  if (sections[0]?.heading !== "## 問題") {
    errors.push(
      "小問あり形式では最初のセクションが「## 問題」である必要があります",
    );
  }

  let expectedNo = 1;
  let overall: Section | null = null;
  for (const [i, section] of sections.entries()) {
    if (i === 0 && section.heading === "## 問題") {
      forbidAnswerSubheadings(section, errors);
      continue;
    }
    const match = section.heading.match(SUBQUESTION_HEADING);
    if (match) {
      if (overall) {
        errors.push(
          `「## 全体解説」の後にセクション「${section.heading}」があります`,
        );
      }
      if (Number(match[1]) !== expectedNo) {
        errors.push(
          `「${section.heading}」の番号が連番ではありません（期待: 設問（${expectedNo}））`,
        );
      }
      expectedNo = Number(match[1]) + 1;
      validateSubQuestion(section, errors);
      continue;
    }
    if (section.heading === "## 全体解説") {
      if (overall) {
        errors.push("「## 全体解説」が複数あります");
      }
      overall = section;
      forbidAnswerSubheadings(section, errors);
      continue;
    }
    if (["## 模範解答", "## 解説"].includes(section.heading)) {
      errors.push(
        `小問あり形式では「${section.heading}」（H2）は使えません（設問内の「###${section.heading.slice(2)}」または「## 全体解説」に記載）`,
      );
      continue;
    }
    errors.push(
      `小問あり形式に想定外のセクション「${section.heading}」があります（設問（n）または全体解説を想定）`,
    );
  }

  if (expectedNo === 1) {
    errors.push("小問あり形式には「## 設問（1）」が必要です");
  }
  if (!overall) {
    errors.push("設問の後は「## 全体解説」で締める必要があります");
  }
  return errors;
}

function validateSubQuestion(section: Section, errors: string[]): void {
  const label = section.heading.replace("## ", "");
  if (!section.hasBody) {
    errors.push(`「${label}」の見出し直下に小問の問題文がありません`);
  }
  const subs = section.subheadings;
  if (subs[0] !== "### 模範解答") {
    errors.push(`「${label}」には「### 模範解答」が必要です`);
    return;
  }
  const rest = subs.slice(1);
  if (rest.length > 0 && !(rest.length === 1 && rest[0] === "### 解説")) {
    errors.push(
      `「${label}」内のH3は「### 模範解答」→「### 解説」のみ許されます（検出: ${rest.join(", ")}）`,
    );
  }
}

/** 問題・全体解説セクションに設問用のH3が紛れ込んでいないこと */
function forbidAnswerSubheadings(section: Section, errors: string[]): void {
  for (const sub of section.subheadings) {
    if (sub === "### 模範解答" || sub === "### 解説") {
      errors.push(
        `「${section.heading}」内に「${sub}」は置けません（設問セクション内に記載）`,
      );
    }
  }
}
