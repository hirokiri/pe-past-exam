# 計画: 出力したPDF/EPUBの目次をネスト構造にする

分析: [analyze.md](./analyze.md) / Issue #9

方針: `scripts/export.ts` がカスタム目次ドキュメント（`manuscript/toc.html`）を生成し、`entry` に `rel: "contents"` で登録する。Vivliostyle CLI は nav に子要素がある目次テンプレートをそのまま採用するため、年度 → 科目 → 問題 の3階層がそのまま PDF 目次ページ・PDF しおり・EPUB nav・webpub に反映される。

## Steps

- [x] **1. ネスト目次のビルダー関数を追加する（テスト可能な純関数）**
  - 変更ファイル: `scripts/export-toc.ts`（新規）
  - `buildTocHtml(questions: Question[], opts: { title: string; hrefFor: (q: Question) => string }): string` を実装する。
    - 入力の並び順（`compareQuestions` 済み）を保持したまま `yearLabel` → `subjectLabel` で安定グルーピングする。
    - 出力は完全な HTML 文書: `<html lang="ja">` + `<head><title>目次</title><style>…</style></head>` + `<body><nav id="toc" role="doc-toc"><h2>目次</h2><ol>…（3階層）…</ol></nav></body>`。
    - 中間ノード（年度・科目）は `<li>` の第1子を **`<span>`** にする（EPUB の `parseTocDocument` が `A`/`SPAN` 以外を拒否し目次ツリーがフォールバックするため — analyze.md 参照）。リーフは `<a href="<原稿名>.html">問題番号 タイトル</a>`。
    - href・テキストは HTML エスケープする（タイトルに `&` 等が入っても壊れないように）。
    - `<style>` は最小限のインデント/行間のみ（UA 既定のネスト表示を補助する程度）。
  - 検証: ステップ3のユニットテスト。
- [x] **2. export.ts から目次を生成・登録する**
  - 変更ファイル: `scripts/export.ts`
  - 原稿ループの後に `buildTocHtml` で `manuscript/toc.html` を書き出す。`hrefFor` は `manuscriptName(q)` の拡張子を `.html` に置換したもの（ビルド後のファイル名と一致させる）。
  - `entries` 配列を `{ path, title, rel? }` 型に広げ、cover の直後に `{ path: "toc.html", rel: "contents", title: "目次" }` を挿入する。表紙は目次に載せない（analyze.md の前提）。
  - config の `toc:` オブジェクトは削除する（カスタム contents エントリがあると自動生成パスは使われない。残すと htmlPath/sectionDepth が無意味に残って紛らわしい）。
  - リスク: `rel: "contents"` エントリのソースはテンプレート扱いになるため、nav が空だと CLI がフラット目次を注入してしまう。ビルダーが必ず `<ol>` 子要素を持つ nav を出すことをテストで担保する。
  - 検証: `bun run export 01-kikai webpub` が成功し、`dist/export/01-kikai/output/01-kikai-html/toc.html` に3階層 `<ol>` があること。
- [x] **3. ユニットテストを追加する**
  - 変更ファイル: `tests/export-toc.test.ts`（新規）
  - `tests/content.test.ts` の流儀（`bun:test`、frontmatter サンプル）に合わせ、複数年度・複数科目のダミー `Question[]` から:
    - 第1階層が年度、第2階層が科目、第3階層が問題リンクになること
    - 入力順（年度降順・必須先行）が保持されること
    - 中間ノードが `<span>`、リーフが `<a href>` であること
    - nav が空でないこと（ステップ2のリスク担保）
    - タイトル中の HTML 特殊文字がエスケープされること
  - 検証: `bun test` グリーン。
- [x] **4. 実ビルドで PDF / EPUB を検証する**
  - コマンド: `bun run export 01-kikai`（Playwright 非対応 OS のためシステムブラウザ使用 — export.ts が自動検出）。
  - webpub: `toc.html` の nav 構造が受入基準2（年度7項目 → 科目 → 問題）を満たすこと。リンク先ファイルが実在すること（`href` と output ディレクトリの突き合わせ）。
  - EPUB: `unzip -p output/01-kikai.epub` で nav ドキュメント（`epub:type="toc"`）を取り出し、3階層 `<ol>` を確認。
  - PDF: 目次ページのインデント表示を目視（またはテキスト抽出）確認し、しおり（アウトライン）のネストを `mutool show … outline` / `pdfinfo` 等の利用可能なツールで確認。しおりがネストしない場合は analyze.md の前提4が崩れるため、原因（Vivliostyle の outline 生成仕様）を調査してから対処を決める — このステップがロールバック判断ポイント。
- [x] **5. 仕上げ検証と自己レビュー**
  - `bun test` / `bun run lint` / `bun run typecheck` をすべて実行しグリーンにする。
  - analyze.md の受入基準1〜7を1つずつ突き合わせて確認する。
  - `/self-review nested-export-toc` に引き継ぐ。

## 実装中の計画変更

- **中間ノードは `<span>` ではなく `<a href>` にする**（ステップ1の当初案を変更）。実ビルド検証で PDF しおりが空になることを確認。原因は viewer の `getTOC()` が TOC ツリーから `:scope > [role=treeitem] > a[href]` しか拾わないため — リンクを持たないノードは自身も子孫もしおりから消える。EPUB の `parseTocDocument` は `A`/`SPAN` 両方を受け付けるので、全ノードを `<a>` にし、年度・科目ノードは配下の先頭問題へリンクする。
- 併せて全 href に `#<docBase>` ハッシュを付与（PDF しおりの named destination は href のハッシュから生成されるため）。原稿の h1 に `{#<docBase>}` で id を振る。

## リスク・注意点

- **EPUB nav のパース要件**（`li` 第1子は `a`/`span` のみ）が最大の落とし穴。違反すると例外ではなく黙ってフラット目次にフォールバックするため、ステップ4の EPUB 実物確認を省略しないこと。
- PDF しおりのネストは Vivliostyle 側挙動への依存（analyze.md 前提4）。実ビルド検証必須。
- `dist/export/` は生成物（ビルドごとに `rm -rf`）なので、既存生成物との差分比較はステップ4の実行前にコピーを取るか、構造チェックのみで判断する。
