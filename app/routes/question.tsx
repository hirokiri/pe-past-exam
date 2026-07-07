import katexCss from "katex/dist/katex.min.css?url";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { findQuestion } from "../lib/content.server";
import { renderMarkdown, splitQuestionBody } from "../lib/markdown.server";
import type { Route } from "./+types/question";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: katexCss },
];

export function meta({ data }: Route.MetaArgs) {
  const title = data
    ? `${data.meta.yearLabel} ${data.meta.subjectLabel} ${data.meta.questionNo} | 技術士過去問題`
    : "問題が見つかりません";
  return [{ title }];
}

export function loader({ params }: Route.LoaderArgs) {
  const question = findQuestion(params.id);
  if (!question) {
    throw new Response("Not Found", { status: 404 });
  }
  const { body, ...meta } = question;
  // 問題文（引用部分）と模範解答・解説（自作部分）を分けてレンダリングし、
  // 引用の明瞭区分（著作権法32条）を表示側で行えるようにする
  const split = splitQuestionBody(body);
  return split
    ? {
        meta,
        questionHtml: renderMarkdown(split.question),
        restHtml: renderMarkdown(split.rest),
      }
    : { meta, questionHtml: null, restHtml: renderMarkdown(body) };
}

/** KaTeX（$...$ / $$...$$）と Mermaid をクライアント側でレンダリングする */
function useContentRendering(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (async () => {
      const [{ default: renderMathInElement }, { default: mermaid }] =
        await Promise.all([
          import("katex/contrib/auto-render"),
          import("mermaid"),
        ]);
      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });
      await mermaid.run({ nodes: el.querySelectorAll("pre.mermaid") });
    })();
  }, [ref]);
}

export default function Question({ loaderData }: Route.ComponentProps) {
  const { meta, questionHtml, restHtml } = loaderData;
  const contentRef = useRef<HTMLDivElement>(null);
  useContentRendering(contentRef);

  return (
    <article>
      <nav className="breadcrumb">
        <Link to="/">ホーム</Link>
        {" › "}
        <Link to={`/questions?exam=${meta.exam}&division=${meta.division}`}>
          {meta.examLabel} {meta.divisionLabel}
        </Link>
        {" › "}
        <Link
          to={`/questions?exam=${meta.exam}&division=${meta.division}&year=${meta.year}`}
        >
          {meta.yearLabel}
        </Link>
      </nav>

      <header className="question-header">
        <p className="question-meta">
          {meta.examLabel}　{meta.divisionLabel}　{meta.subjectLabel}　
          {meta.yearLabel}
        </p>
        <h1>
          {meta.questionNo}　{meta.title}
        </h1>
        {meta.tags.length > 0 && (
          <ul className="tag-list">
            {meta.tags.map((tag) => (
              <li key={tag}>
                <Link to={`/questions?q=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div ref={contentRef} className="question-content">
        {questionHtml !== null && (
          <>
            <h2>問題</h2>
            {/* 過去問題文は著作権法32条の引用として枠で明瞭区分し、出所を明示する */}
            <blockquote className="question-quote">
              <div
                // biome-ignore lint/security/noDangerouslySetInnerHtml: リポジトリ管理のMarkdownをサーバー側で変換したHTMLのみを渡す（外部入力なし）
                dangerouslySetInnerHTML={{ __html: questionHtml }}
              />
              <footer className="question-source">
                {`出典：公益社団法人 日本技術士会　${meta.yearLabel}　${meta.examLabel}（${meta.divisionLabel}）　${meta.questionNo}`}
              </footer>
            </blockquote>
          </>
        )}
        <div
          className="question-rest"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: リポジトリ管理のMarkdownをサーバー側で変換したHTMLのみを渡す（外部入力なし）
          dangerouslySetInnerHTML={{ __html: restHtml }}
        />
      </div>
    </article>
  );
}
