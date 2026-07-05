/** コンテンツMarkdownのfrontmatterに対応する問題メタデータ */
export interface QuestionMeta {
  /** 例: second-01-r07-hisshu-I-1 */
  id: string;
  exam: "first" | "second";
  examLabel: string;
  /** 部門コード 例: "01" */
  division: string;
  divisionLabel: string;
  /** "hisshu" または選択科目コード 例: "0103" */
  subject: string;
  subjectLabel: string;
  /** 年度コード 例: "r07" */
  year: string;
  yearLabel: string;
  /** 問題番号 例: "Ⅰ−1" */
  questionNo: string;
  title: string;
  tags: string[];
  sourcePdf?: string;
  status: "draft" | "transcribed" | "answered" | "reviewed";
}

/** メタデータ + Markdown本文 */
export interface Question extends QuestionMeta {
  /** Markdown本文（問題→模範解答→解説） */
  body: string;
  /** content/ からの相対パス */
  path: string;
}
