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

/** 問題本文の表示用セグメント */
export interface QuestionSegment {
  /** 過去問題文の引用部分なら true（表示側で引用枠に入れる） */
  quote: boolean;
  /** 引用セグメントの構造見出し（「問題」「設問（1）」等）。自作部分は null */
  heading: string | null;
  /** セグメントのMarkdown（自作部分は自身のセクション見出しを含む） */
  markdown: string;
}

/**
 * 本文を「過去問題文（引用部分）」と「模範解答・解説（自作部分）」のセグメント列に
 * 分割する。引用の明瞭区分（著作権法32条）を表示側で行えるようにするためのもの。
 *
 * - 小問なし: 「## 問題」セクションが引用、それ以降が自作部分。
 * - 小問あり: 「## 問題」のリード文と各「## 設問（n）」の問題文（### 模範解答 の
 *   手前まで）が引用、各設問の模範解答・解説と「## 全体解説」が自作部分。
 *
 * 引用セグメントの見出し行は markdown に含めず heading で返す（表示側で枠外に付ける）。
 * 「## 問題」見出しが無い場合は null（呼び出し側で全文レンダリングにフォールバック）。
 */
export function segmentQuestionBody(md: string): QuestionSegment[] | null {
  const lines = md.split("\n");
  const isH2 = (line: string) =>
    /^##\s+\S/.test(line) && !line.startsWith("###");
  if (!lines.some((line) => /^##\s+問題\s*$/.test(line))) return null;

  // H2セクションに分割する（最初のH2より前の行は既存動作どおり無視）
  const sections: { title: string; body: string[] }[] = [];
  for (const line of lines) {
    if (isH2(line)) {
      sections.push({ title: line.replace(/^##\s+/, "").trim(), body: [] });
      continue;
    }
    sections.at(-1)?.body.push(line);
  }

  const segments: QuestionSegment[] = [];
  for (const { title, body } of sections) {
    if (title === "問題") {
      segments.push({
        quote: true,
        heading: title,
        markdown: body.join("\n").trim(),
      });
      continue;
    }
    if (/^設問（\d+）$/.test(title)) {
      // 設問の問題文（引用）と ### 模範解答 以降（自作）に分ける
      const answerStart = body.findIndex((line) =>
        /^###\s+模範解答\s*$/.test(line),
      );
      const questionPart =
        answerStart === -1 ? body : body.slice(0, answerStart);
      segments.push({
        quote: true,
        heading: title,
        markdown: questionPart.join("\n").trim(),
      });
      if (answerStart !== -1) {
        segments.push({
          quote: false,
          heading: null,
          markdown: body.slice(answerStart).join("\n").trim(),
        });
      }
      continue;
    }
    // 模範解答・解説・全体解説など自作セクションは見出しごと自作部分に含める
    const markdown = `## ${title}\n${body.join("\n")}`.trim();
    const prev = segments.at(-1);
    if (prev && !prev.quote) {
      prev.markdown = `${prev.markdown}\n\n${markdown}`;
    } else {
      segments.push({ quote: false, heading: null, markdown });
    }
  }
  return segments.filter((s) => s.quote || s.markdown !== "");
}
