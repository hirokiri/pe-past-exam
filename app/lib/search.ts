import type { Question } from "./types";

export interface SearchFilters {
  exam?: string;
  division?: string;
  subject?: string;
  year?: string;
  /** キーワード（スペース区切りAND） */
  q?: string;
}

/** 全角英数→半角、カタカナはそのまま、大文字→小文字 に正規化 */
export function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

function matchesKeyword(question: Question, keyword: string): boolean {
  const haystack = normalize(
    [
      question.title,
      question.questionNo,
      question.tags.join(" "),
      question.body,
    ].join(" "),
  );
  return keyword
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .every((w) => haystack.includes(normalize(w)));
}

/** 部門・年度・科目・キーワードで問題を絞り込む */
export function filterQuestions(
  questions: Question[],
  filters: SearchFilters,
): Question[] {
  return questions.filter((question) => {
    if (filters.exam && question.exam !== filters.exam) return false;
    if (filters.division && question.division !== filters.division)
      return false;
    if (filters.subject && question.subject !== filters.subject) return false;
    if (filters.year && question.year !== filters.year) return false;
    if (filters.q && !matchesKeyword(question, filters.q)) return false;
    return true;
  });
}
