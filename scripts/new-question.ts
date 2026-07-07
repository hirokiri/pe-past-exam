/**
 * 問題Markdownの雛形を生成する。
 *
 * 使い方:
 *   bun run scripts/new-question.ts <exam> <division> <year> <subject> <questionNo>
 *   例: bun run scripts/new-question.ts second 01 r07 hisshu I-1
 *       bun run scripts/new-question.ts second 01 r07 0103 II-1-1
 *
 * questionNo はファイル名用の半角表記（I-1, II-1-1 など）。
 * frontmatter には全角ローマ数字表記が入る。
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DIVISIONS, EXAMS, KIKAI_SUBJECTS, YEARS } from "../app/lib/taxonomy";

const [exam, division, year, subject, questionNo] = process.argv.slice(2);

if (!exam || !division || !year || !subject || !questionNo) {
  console.error(
    "使い方: bun run scripts/new-question.ts <exam> <division> <year> <subject> <questionNo>",
  );
  process.exit(1);
}

const examLabel = EXAMS[exam as keyof typeof EXAMS];
const divisionLabel = DIVISIONS[division];
const yearLabel = YEARS[year];
const subjectLabel =
  division === "01"
    ? KIKAI_SUBJECTS[subject]
    : subject === "hisshu"
      ? "必須科目Ⅰ"
      : subject;

if (!examLabel || !divisionLabel || !yearLabel || !subjectLabel) {
  console.error(
    `不明なコードがあります: exam=${exam} division=${division} year=${year} subject=${subject}`,
  );
  process.exit(1);
}

/** I-1 → Ⅰ−1 のように全角ローマ数字表記へ変換 */
function toDisplayQuestionNo(no: string): string {
  const roman: Record<string, string> = { III: "Ⅲ", II: "Ⅱ", I: "Ⅰ" };
  const [head, ...rest] = no.split("-");
  return [roman[head] ?? head, ...rest].join("−");
}

const divisionSlugs: Record<string, string> = { "01": "01-kikai" };
const divisionDir = divisionSlugs[division] ?? division;
const id = `${exam}-${division}-${year}-${subject}-${questionNo}`;
const path = join(
  process.cwd(),
  "content",
  exam,
  divisionDir,
  year,
  subject,
  `${questionNo}.md`,
);

if (existsSync(path)) {
  console.error(`既に存在します: ${path}`);
  process.exit(1);
}

const pdfName =
  subject === "hisshu" ? `${year}_hisshu.pdf` : `${year}_${subject}.pdf`;

const template = `---
id: ${id}
exam: ${exam}
examLabel: ${examLabel}
division: "${division}"
divisionLabel: ${divisionLabel}
subject: ${subject}
subjectLabel: ${subjectLabel}
year: ${year}
yearLabel: ${yearLabel}
questionNo: ${toDisplayQuestionNo(questionNo)}
title: TODO タイトル
tags: []
sourcePdf: data/pdf/${exam}/${divisionDir}/${pdfName}
status: draft
---

## 問題

TODO: ${pdfName} から問題文を忠実に転記する。図表はMermaid/LaTeX優先、困難な場合はPDFから画像を切り出す。
小問（（1）〜（n））がある場合は、共通リード文のみをここに残し、各小問は「## 設問（n）」へ転記する。

## 模範解答

TODO: 記述式論文形式（指定文字数相当）で作成する。
小問がある場合はこのセクションを削除し、小問ごとに次の構成で記載する:

\`\`\`
## 設問（1）
（小問(1)の問題文）
### 模範解答
### 解説   ← 設問固有の解説。無ければ省略可
\`\`\`

## 解説

TODO: 出題趣旨・答案のポイント・背景知識を概ね1ページで記述する。
小問がある場合はセクション名を「## 全体解説」とし、全設問にわたる内容（出題趣旨・背景知識など）を記載する。

### 出典・参考文献

- TODO: 調査に用いた信頼できる文献・Webページを明記する。
`;

await mkdir(dirname(path), { recursive: true });
await writeFile(path, template);
console.log(`created: ${path}`);
