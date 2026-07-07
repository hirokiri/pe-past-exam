import { Marked } from "marked";

/** セクション見出し（問題/設問（n）/模範解答/解説/全体解説）→ 色分け用CSSクラス */
function sectionClass(headingText: string): string | undefined {
  if (headingText === "問題" || /^設問（\d+）$/.test(headingText)) {
    return "sec-question";
  }
  if (headingText === "模範解答") return "sec-answer";
  if (headingText === "解説" || headingText === "全体解説") {
    return "sec-explain";
  }
  return undefined;
}

/**
 * コンテンツMarkdown → HTML。
 * mermaid コードブロックは <pre class="mermaid"> にし、クライアント側で描画する。
 * $...$ / $$...$$ の数式はそのまま出力し、クライアント側の KaTeX auto-render に任せる。
 * セクション見出しには色分け用のクラスを付ける（小問あり/なし両形式に対応）。
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
    heading({ tokens, depth, text }) {
      const cls = sectionClass(text);
      const attr = cls ? ` class="${cls}"` : "";
      return `<h${depth}${attr}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
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
