# 実装計画: 著作権法上の「引用」（第32条）として利用する

対象: `docs/copyright-quotation/analyze.md`（Issue #12）

方針: content/ の Markdown 70ファイルは変更しない。サーバー側で本文を「問題セクション」と「それ以降（模範解答・解説）」に分割し、問題部分を引用枠（`<blockquote class="question-quote">`）で囲んで出典を自動表示する。topページには主従関係の説明を追加する。

## Steps

- [x] **1. 本文分割ヘルパー `splitQuestionBody` を追加**
  - 変更: `app/lib/markdown.server.ts`
  - `## 問題` 見出し行の直後から次の行頭 `## ` までを `question`、それ以降（`## 模範解答` から）を `rest` として返す `splitQuestionBody(md): { question: string; rest: string } | null` を実装。`## 問題` が見つからない場合は `null`（呼び出し側で従来どおり全文レンダリングにフォールバック）。
  - 検証: 手順2のユニットテストで確認。

- [x] **2. 分割ヘルパーのユニットテスト**
  - 変更: `tests/markdown.test.ts`（新規）
  - ケース: (a) 標準構成（問題→模範解答→解説）で正しく分割される、(b) `## 問題` がない本文で `null`、(c) 問題文中の `###` 小見出しや数式・表を含んでも次の `## ` までを question とする。
  - 検証: `bun test` green。

- [x] **3. 問題詳細ページで引用枠＋出典を表示**
  - 変更: `app/routes/question.tsx`
  - loader で `splitQuestionBody(body)` を使い `{ questionHtml, restHtml }` を返す（分割不能時は従来の `html` フォールバック）。
  - コンポーネントは単一の `contentRef` 付きラッパー `<div className="question-content">` の中に、`<h2>問題</h2>` →
    `<blockquote className="question-quote">`（中身: questionHtml の `dangerouslySetInnerHTML` ＋ `<footer className="question-source">出典：公益社団法人 日本技術士会　{meta.yearLabel}　{meta.examLabel}（{meta.divisionLabel}）　{meta.questionNo}</footer>`）→ restHtml の `<div>` の順で描画。
  - KaTeX/Mermaid の `useContentRendering` はラッパー全体を走査するため変更不要（引用枠内の数式もレンダリングされることを手順6で確認）。
  - リスク: `## 問題` 見出しを Markdown から除去して JSX 側で出すため、見出しの二重表示に注意（question 側から見出し行を確実に落とす）。
  - 検証: `bun run typecheck`、手順6のブラウザ確認。

- [x] **4. 引用枠スタイルと h2 配色セレクタの追随**
  - 変更: `app/app.css`
  - `.question-quote` を四角ボーダー（`border: 2px solid var(--border)` 程度、角丸・パディング、既存 blockquote スタイルより明確な「枠」）で追加。`.question-source` は右寄せ・小さめ・`--fg-muted`。
  - 既存の `.question-content h2:nth-of-type(2)/(3)`（模範解答/解説の配色）は DOM 構造変更で崩れるため、rest コンテナ基準のセレクタ（例: `.question-rest h2:nth-of-type(1)/(2)`）に更新。h2「問題」の既存配色（accent）は維持。
  - リスク: nth-of-type 依存の配色がズレやすい箇所。3セクションの配色が変更前と同一かを目視確認する。
  - 検証: 手順6のスクリーンショット比較。

- [x] **5. topページに主従関係を明示**
  - 変更: `app/routes/home.tsx`
  - hero セクション直下に説明ブロックを追加。文言案:
    「本サイトは、技術士試験の学習のために独自に作成した模範解答・解説を主たるコンテンツとして提供しています。過去問題の問題文は、解説に必要な範囲で著作権法第32条に基づく引用として掲載し（従たる利用）、各ページで枠内に区分のうえ出典（公益社団法人 日本技術士会）を明示しています。」
  - 検証: 手順6でtopページ表示確認。

- [x] **6. ブラウザでの動作確認**
  - `run-pe-past-exam` スキルでアプリを起動し、topページと問題詳細ページ（数式を含む `second-01-r01-0103-II-1-2` など）をスクリーンショット確認:
    問題文が枠内・出典表示あり・模範解答/解説は枠外・KaTeX/Mermaid 描画正常・topページに主従関係文言。
  - 検証: スクリーンショット目視。

- [x] **7. 最終検証・セルフレビュー**
  - `bun test` / `bun run typecheck` / `bun run lint` / `bun run build` をすべて green に。
  - analyze.md の Acceptance criteria 6項目を順に照合（content/ 配下が無変更であることを `git status` で確認）。
  - 検証: 上記コマンドの結果と照合結果を記録。

## 実装時のメモ（計画からの差分）

- 既存の `.question-content blockquote` 汎用スタイルが引用枠に被るため、セレクタを `:not(.question-quote)` で除外した。
- ワークツリーの dev サーバーは `node_modules` シンボリックリンクにより Vite の `@fs` 403 でクライアントJSが読めない（環境要因）。ブラウザ確認は本番ビルド（`bun run start`, :3000）で実施し、smoke OK・引用枠内外の KaTeX 描画（`second-01-r03-0103-II-1-4` で枠内4箇所）を確認した。

## Acceptance criteria との対応

| 基準 | ステップ |
|---|---|
| 1. 問題文が枠囲み・解答/解説は枠外 | 1,3,4,6 |
| 2. 出典の自動表示 | 3,6 |
| 3. topページの主従関係明示 | 5,6 |
| 4. KaTeX/Mermaid 正常 | 3,6 |
| 5. テスト・ビルド green | 2,7 |
| 6. content/ 無変更 | 全ステップ（方針）+7 |
