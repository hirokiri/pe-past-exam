import { Form, Link, useSearchParams } from "react-router";
import { loadQuestions } from "../lib/content.server";
import { filterQuestions } from "../lib/search";
import type { Route } from "./+types/questions";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "問題検索 | 技術士過去問題 模範解答解説集" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filters = {
    exam: url.searchParams.get("exam") ?? undefined,
    division: url.searchParams.get("division") ?? undefined,
    subject: url.searchParams.get("subject") ?? undefined,
    year: url.searchParams.get("year") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  };
  const all = loadQuestions();

  const options = {
    divisions: uniqueBy(
      all,
      (q) => q.division,
      (q) => q.divisionLabel,
    ),
    years: uniqueBy(
      all,
      (q) => q.year,
      (q) => q.yearLabel,
    ),
    subjects: uniqueBy(
      all,
      (q) => q.subject,
      (q) => q.subjectLabel,
    ),
  };

  const results = filterQuestions(all, filters).map((q) => ({
    id: q.id,
    yearLabel: q.yearLabel,
    divisionLabel: q.divisionLabel,
    subjectLabel: q.subjectLabel,
    questionNo: q.questionNo,
    title: q.title,
    tags: q.tags,
    status: q.status,
  }));

  return { results, options };
}

function uniqueBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  labelFn: (item: T) => string,
): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(keyFn(item), labelFn(item));
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

export default function Questions({ loaderData }: Route.ComponentProps) {
  const { results, options } = loaderData;
  const [searchParams] = useSearchParams();

  return (
    <div>
      <h1>問題検索</h1>
      <Form method="get" className="search-form">
        <input
          type="search"
          name="q"
          placeholder="キーワード（例: 振動 固有振動数）"
          defaultValue={searchParams.get("q") ?? ""}
        />
        <select
          name="division"
          defaultValue={searchParams.get("division") ?? ""}
        >
          <option value="">すべての部門</option>
          {options.divisions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select name="subject" defaultValue={searchParams.get("subject") ?? ""}>
          <option value="">すべての科目</option>
          {options.subjects.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select name="year" defaultValue={searchParams.get("year") ?? ""}>
          <option value="">すべての年度</option>
          {options.years.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit">検索</button>
      </Form>

      <p className="result-count">{results.length}件</p>
      <ul className="question-list">
        {results.map((q) => (
          <li key={q.id}>
            <Link to={`/questions/${q.id}`}>
              <span className="question-meta">
                {q.yearLabel}　{q.divisionLabel}　{q.subjectLabel}　
                {q.questionNo}
              </span>
              <span className="question-title">{q.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
