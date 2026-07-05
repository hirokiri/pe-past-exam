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

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}
