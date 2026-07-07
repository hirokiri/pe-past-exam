import { Marked } from "marked";

/**
 * コンテンツMarkdown → HTML。
 * mermaid コードブロックは <pre class="mermaid"> にし、クライアント側で描画する。
 * $...$ / $$...$$ の数式はそのまま出力し、クライアント側の KaTeX auto-render に任せる。
 */
const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
      }
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>\n`;
    },
  },
});

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

/**
 * 本文を「## 問題」セクション（引用部分）とそれ以降（模範解答・解説）に分割する。
 * question に「## 問題」見出し行自体は含めない（見出しは表示側で付ける）。
 * 「## 問題」見出しが無い場合は null（呼び出し側で全文レンダリングにフォールバック）。
 */
export function splitQuestionBody(
  md: string,
): { question: string; rest: string } | null {
  const lines = md.split("\n");
  const start = lines.findIndex((line) => /^##\s+問題\s*$/.test(line));
  if (start === -1) return null;
  const nextHeading = lines.findIndex(
    (line, i) => i > start && /^##\s/.test(line),
  );
  const end = nextHeading === -1 ? lines.length : nextHeading;
  return {
    question: lines
      .slice(start + 1, end)
      .join("\n")
      .trim(),
    rest: lines.slice(end).join("\n").trim(),
  };
}
