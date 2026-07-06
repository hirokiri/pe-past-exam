/**
 * エクスポート用のネスト目次（toc.html）を生成する。
 *
 * Vivliostyle CLI は rel: "contents" エントリの nav に子要素があると
 * 中身を自動生成せずそのまま採用するため、ここで
 * 年度 → 科目 → 問題 の3階層を組み立てる。
 *
 * 全ノードを <a href="...#アンカー"> にする。PDF のしおりは viewer の
 * getTOC() が a[href] のハッシュを named destination として拾う仕組みで、
 * リンクを持たないノードは自身も子孫もしおりから消えるため。
 * 年度・科目ノードは配下の先頭問題へリンクする。
 */
import { escapeHtml } from "../app/lib/markdown.server";
import type { Question } from "../app/lib/types";

/** 入力順を保ったまま連続する同一キーで束ねる（入力は compareQuestions 済み前提） */
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups: [string, T[]][] = [];
  for (const item of items) {
    const k = key(item);
    const last = groups.at(-1);
    if (last && last[0] === k) {
      last[1].push(item);
    } else {
      groups.push([k, [item]]);
    }
  }
  return groups;
}

const TOC_STYLE = `
nav[role="doc-toc"] ol {
  list-style: none;
  padding-inline-start: 1.5em;
  line-height: 1.8;
}
nav[role="doc-toc"] > ol {
  padding-inline-start: 0;
}
nav[role="doc-toc"] a {
  text-decoration: none;
  color: inherit;
}
nav[role="doc-toc"] > ol > li > a,
nav[role="doc-toc"] > ol > li > ol > li > a {
  font-weight: bold;
}
`;

/** 年度 → 科目 → 問題 の3階層 nav を持つ目次HTML文書を返す */
export function buildTocHtml(
  questions: Question[],
  { title, hrefFor }: { title: string; hrefFor: (q: Question) => string },
): string {
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(encodeURI(href))}">${escapeHtml(label)}</a>`;

  const years = groupBy(questions, (q) => q.yearLabel).map(
    ([yearLabel, inYear]) => {
      const subjects = groupBy(inYear, (q) => q.subjectLabel).map(
        ([subjectLabel, inSubject]) => {
          const items = inSubject.map(
            (q) =>
              `<li>${link(hrefFor(q), `${q.questionNo}　${q.title}`)}</li>`,
          );
          return `<li>${link(hrefFor(inSubject[0]), subjectLabel)}<ol>${items.join("")}</ol></li>`;
        },
      );
      return `<li>${link(hrefFor(inYear[0]), yearLabel)}<ol>${subjects.join("")}</ol></li>`;
    },
  );

  return `<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${TOC_STYLE}</style>
</head>
<body>
<nav id="toc" role="doc-toc">
<h2>目次</h2>
<ol>${years.join("\n")}</ol>
</nav>
</body>
</html>
`;
}
