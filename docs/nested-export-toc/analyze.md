# 分析: 出力したPDF/EPUBの目次をネスト構造にする

## Source

- Issue: https://github.com/hirokiri/pe-past-exam/issues/9 (#9)
- Title: 出力したpdfやepubの目次がフラットになっている
- Slug: `nested-export-toc`

## Goal

`bun run export <divisionSlug>` で生成する PDF / EPUB / webpub の目次が、現状は全問題が同一レベルに並ぶフラットな `<ol>` になっている。これを 年度 → 科目（必須／選択） → 問題 のネスト構造にし、読者が目次から目的の問題へたどりやすくする。

Issue 本文は「年度、部門、必須／選択のカテゴリなどでネスト構造にすること」。エクスポートは部門単位（1冊 = 1部門）なので、部門は書籍タイトル自体であり目次の階層には含めない（下記「制約と前提」参照）。

## 現状の仕組み（コードで確認済み）

- `scripts/export.ts` が `content/*/<divisionSlug>/` の Markdown を収集し、`compareQuestions`（年度降順 → hisshu優先 → 問題番号）で整列、1問1ファイルの原稿を `dist/export/<divisionSlug>/manuscript/` に生成する。
- 目次は Vivliostyle CLI の自動生成に任せている: `vivliostyle.config.cjs` に `toc: { title: "目次", htmlPath: "toc.html", sectionDepth: 1 }` を出力し、`entry` はフラットな `{path, title}` 配列 (scripts/export.ts:88-135)。
- Vivliostyle CLI (9.7.3) の既定 `transformDocumentList` はエントリ一覧を単一階層の `<ol>` に変換するため、目次がフラットになる（`node_modules/@vivliostyle/cli/dist/chunk-WELNNHOB.js` の `defaultTocTransform`）。
- 生成済みの `dist/export/01-kikai/.vivliostyle/toc.html` で全 `<li data-section-level="1">` のフラット構造を実測確認。

### Vivliostyle CLI の挙動（実装読解で確認済み・設計の根拠）

1. **`rel: "contents"` エントリを自分で用意すると自動生成を置き換えられる**: `entry` に `{ path, rel: "contents" }` を含めると CLI はそれをテンプレートとして使い、`config.toc` による自動 unshift はスキップされる（`isContentsEntry` / `!entries.find(({rel}) => rel === "contents")` 分岐）。
2. **nav に子要素が既にあれば CLI は中身を触らない**: `processTocHtml` は `nav / [role="doc-toc"]` が空のときだけ目次リストを注入する（`if (nav && !nav.hasChildNodes())`）。つまり自前でネストした `<nav role="doc-toc"><ol>…` を書けばそのまま通る。
3. **EPUB 変換はネストを保持する**: `parseTocDocument` が `<li><a>…<ol>…</ol></li>` を再帰パースして EPUB の nav（`epub:type="toc"`）に変換するため、ネスト構造は EPUB リーダーの目次にそのまま反映される。
4. PDF のしおり（アウトライン）は Vivliostyle が doc-toc nav から生成するため、nav のネストがそのまま反映される見込み（要ビルド後検証）。

## Requirements

- [ ] PDF の目次ページが 年度 → 科目 → 問題 のネスト表示になる（インデントで階層が視認できる）
- [ ] PDF のしおり（アウトライン）が同じネスト構造になる
- [ ] EPUB の目次（nav ドキュメント）が同じネスト構造になる
- [ ] webpub（HTML）の toc.html も同じネスト構造になる
- [ ] 目次の並び順は既存の `compareQuestions` と同じ（年度降順、必須科目が選択科目より先、問題番号昇順）
- [ ] 各リーフ項目から該当問題のページ／HTMLへ正しくリンクされる
- [ ] `bun run export <slug>` の CLI インターフェースは変更しない
- [ ] 既存の `bun test` / `bun run lint` / `bun run typecheck` が通る

## Affected areas

- `scripts/export.ts` — 唯一の変更対象。ネストした目次 HTML（`toc.html`）を原稿として生成し、`entry` に `{ path: "toc.html", rel: "contents" }` を追加する。既存の `toc:` 設定オブジェクトは `title`/`htmlPath` の既定値供給として残すか、エントリ側に `title` を持たせて簡素化するかは計画フェーズで決定。
- `app/lib/types.ts` (`QuestionMeta`) — 変更不要。グルーピングに必要な `yearLabel` / `subjectLabel` / `questionNo` / `title` は既に揃っている（読み取りのみ）。
- `app/lib/content.server.ts` (`compareQuestions`, `parseQuestionFile`) — 変更不要（再利用）。

## 実装アプローチ（分析時点の推奨）

**カスタム目次ドキュメント方式**: export.ts は各問題の年度・科目メタデータを持っているので、`manuscript/toc.html` に

```
<nav id="toc" role="doc-toc">
  <h2>目次</h2>
  <ol>
    <li><span>令和7年度</span>
      <ol>
        <li><span>必須科目Ⅰ</span>
          <ol><li><a href="r07_hisshu_I-1.html">Ⅰ−1 …</a></li>…</ol>
        </li>…
      </ol>
    </li>…
  </ol>
</nav>
```

の形で書き出し、`entry` の先頭（cover の直後）に `rel: "contents"` で登録する。

代替案として `toc.transformDocumentList` に関数を渡す方法もあるが、現在 config を `JSON.stringify` で生成しているため関数を埋め込めず、またグルーピング情報をファイル名から再パースする必要があり脆い。採用しない。

注意: EPUB の `parseTocDocument` は `<li>` の第1子が `A` か `SPAN` であることを要求する（それ以外は目次ツリー全体が null になり自動生成へフォールバック）。中間ノード（年度・科目）はリンク先を持たないので `<span>` を使うこと。

## Constraints & assumptions

- **階層構成**: 年度（第1階層）→ 科目（第2階層。必須科目Ⅰ / 各選択科目のラベル）→ 問題（第3階層）。Issue の「部門」は1冊=1部門のため階層に含めない。将来 `first`（第一次試験）のコンテンツが入った場合の試験種別階層は本対応のスコープ外（現状 `content/` には `second` のみ存在することを確認済み）。
- **表紙の扱い**: 現状のフラット目次には表紙自身も1項目として並んでいたが、カスタム目次では表紙は目次に載せない（一般的な書籍慣行に合わせる）。
- 目次ページ自体のスタイルは UA 既定のネストインデントで十分とし、必要最小限のスタイルのみ `toc.html` に付与する。
- PDF しおりのネスト反映は Vivliostyle 側の挙動に依存するため、実装後に実ビルドで検証する（`run-pe-past-exam` スキル記載のとおり Playwright 非対応 OS ではシステムブラウザを使用）。

## Acceptance criteria

1. `bun run export 01-kikai` が成功し、`dist/export/01-kikai/output/` に PDF / EPUB / webpub が生成される。
2. webpub の `toc.html`: `nav[role="doc-toc"]` 直下の `<ol>` の子 `<li>` が年度単位（7項目: 令和7〜元年度）で、各年度 `<li>` 内に科目 `<ol>`、科目 `<li>` 内に問題リンク `<ol>` がある3階層構造。
3. EPUB を unzip した nav ドキュメントに同じ3階層の `<ol>` ネストがある。
4. PDF の目次ページが階層インデント表示になっており、PDF アウトライン（しおり）も年度→科目→問題でネストしている。
5. 問題リンクをたどると該当問題の HTML（webpub）に到達する（href がビルド後ファイル名と一致）。
6. 並び順が既存ソート（年度降順・必須先行・問題番号昇順）のまま。
7. `bun test`、`bun run lint`、`bun run typecheck` がすべて成功する。

## Open questions

なし（ブロッキングな不明点はない。階層構成・表紙の扱いは上記前提として明記）。
