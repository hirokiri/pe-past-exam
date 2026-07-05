import { Link } from "react-router";
import { loadQuestions } from "../lib/content.server";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "技術士過去問題 模範解答解説集" },
    {
      name: "description",
      content: "技術士試験の過去問題・模範解答・解説を検索・閲覧できます",
    },
  ];
}

interface DivisionSummary {
  exam: string;
  examLabel: string;
  division: string;
  divisionLabel: string;
  years: { year: string; yearLabel: string; count: number }[];
  total: number;
}

export function loader(_args: Route.LoaderArgs) {
  const questions = loadQuestions();
  const map = new Map<string, DivisionSummary>();
  for (const q of questions) {
    const key = `${q.exam}-${q.division}`;
    let summary = map.get(key);
    if (!summary) {
      summary = {
        exam: q.exam,
        examLabel: q.examLabel,
        division: q.division,
        divisionLabel: q.divisionLabel,
        years: [],
        total: 0,
      };
      map.set(key, summary);
    }
    summary.total += 1;
    const yearEntry = summary.years.find((y) => y.year === q.year);
    if (yearEntry) {
      yearEntry.count += 1;
    } else {
      summary.years.push({ year: q.year, yearLabel: q.yearLabel, count: 1 });
    }
  }
  return { divisions: [...map.values()], totalCount: questions.length };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { divisions, totalCount } = loaderData;
  return (
    <div>
      <section className="hero">
        <h1>技術士過去問題 模範解答解説集</h1>
        <p>
          技術士試験の過去問題を「問題 → 模範解答 →
          解説」の構成で収録しています。 現在
          {totalCount}問を収録。
        </p>
        <Link to="/questions" className="button-primary">
          問題を探す
        </Link>
      </section>

      {divisions.length === 0 ? (
        <p className="empty">まだコンテンツがありません。</p>
      ) : (
        divisions.map((d) => (
          <section key={`${d.exam}-${d.division}`} className="division-card">
            <h2>
              {d.examLabel}　{d.divisionLabel}
              <span className="count">（{d.total}問）</span>
            </h2>
            <ul className="year-list">
              {d.years.map((y) => (
                <li key={y.year}>
                  <Link
                    to={`/questions?exam=${d.exam}&division=${d.division}&year=${y.year}`}
                  >
                    {y.yearLabel}（{y.count}問）
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
