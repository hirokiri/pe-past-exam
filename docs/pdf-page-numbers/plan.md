# 実装計画: PDF ファイルにページ番号を付与

対象分析: [analyze.md](./analyze.md)（Issue #7, slug: `pdf-page-numbers`）

## Steps

- [x] **1. ページ番号用スタイルシートの生成を `scripts/export.ts` に追加**
  - 変更ファイル: `scripts/export.ts`
  - アプローチ: 原稿生成後・config 生成前に、`EXPORT_DIR/theme.css` を `writeFile` で書き出す。内容は CSS Paged Media のマージンボックス指定:
    ```css
    @page {
      @bottom-center {
        content: counter(page);
      }
    }
    ```
  - 検証: 次ステップのビルドで CSS が生成されることを確認（`dist/export/<slug>/theme.css`）。

- [x] **2. 生成する vivliostyle config に `theme` を追加**
  - 変更ファイル: `scripts/export.ts`（config オブジェクトリテラル、現行 `scripts/export.ts:121-136` 付近）
  - アプローチ: config に `theme: "./theme.css"` を追加。config ファイル（`EXPORT_DIR/vivliostyle.config.cjs`）と同じディレクトリに CSS を置くので相対パスで解決される。
  - 検証: 生成された `dist/export/01-kikai/vivliostyle.config.cjs` に `"theme": "./theme.css"` が含まれる。

- [x] **3. PDF エクスポートの実機検証**
  - 実行: `bun run scripts/export.ts 01-kikai pdf`（システム Chromium フォールバックが効く）
  - 検証（受け入れ基準 1–3）:
    - `dist/export/01-kikai/output/01-kikai.pdf` が生成される
    - `pdftotext -layout` で複数ページの下部にページ番号（1 起点の通し番号）が出ていることを確認
    - 可能なら 1 ページを `pdftoppm` で画像化し「下部中央」に配置されていることを目視確認
  - リスク: ブラウザ未検出でビルド失敗 → 既存フォールバック（`--executable-browser`）の範囲。CSS 追加で組版が崩れる可能性は低いが、確認は PDF 全体をざっと眺める。

- [x] **4. EPUB / webpub のリグレッション確認**
  - 実行: `bun run scripts/export.ts 01-kikai epub,webpub`
  - 検証（受け入れ基準・非機能）: 両フォーマットがエラーなく生成される（`@page` はページ組版時のみ効くため実害なし想定）。

- [x] **5. lint / typecheck / test と自己レビュー**
  - 実行: `bun run lint` / `bun run typecheck` / `bun test`（受け入れ基準 4）
  - `docs/pdf-page-numbers/analyze.md` の受け入れ基準を全件照合し、diff を見直す（`/self-review` フェーズへ引き継ぎ）。

- [x] **6. (実装中に発覚) EPUB 出力の出力先ディレクトリ未作成バグの修正**
  - 変更ファイル: `scripts/export.ts`
  - 内容: vivliostyle の EPUB エクスポータは `output/` ディレクトリを自動作成せず ENOENT で失敗する（PDF/webpub は作成する）。デフォルトの `pdf,epub,webpub` 順では PDF が先にディレクトリを作るため顕在化していなかった既存バグ。build 前に `mkdir(EXPORT_DIR/output, { recursive: true })` を追加。
  - 検証: `bun run scripts/export.ts 01-kikai epub,webpub` が成功（修正前は変更なしのベースコードでも同条件で失敗することを確認済み）。

## Risks / notes

- 生成物ディレクトリ `dist/export/` は毎回 `rm -rf` されるため、CSS はスクリプトから毎回生成する（手置きファイル不可）。
- 表紙のページ番号は仕様どおり付与（除外要求なし）。除外要望が出たら `@page :first { @bottom-center { content: none; } }` を追記するだけでロールバック容易。
