# 分析: PDF ファイルにページ番号を付与

## Source

- Issue: https://github.com/hirokiri/pe-past-exam/issues/7 (#7)
- タイトル: PDF ファイルにページ番号を付与
- 本文: 「出力したpdfファイルの下部中央にページ番号を付与する。」
- slug: `pdf-page-numbers`

## Goal

`bun run export`（`scripts/export.ts`）が生成する部門別 PDF の各ページ下部中央にページ番号が印字されていれば「完了」。現状は Vivliostyle のデフォルト（ページ番号なし）で出力されている。

## Requirements

- [ ] 出力 PDF の各ページ下部中央にページ番号（通し番号）が表示される
- [ ] 既存のエクスポートフロー（`bun run scripts/export.ts <divisionSlug> [formats]`）の使い方を変えない
- [ ] EPUB / webpub 出力が壊れない（`@page` ルールはページ組版時のみ効くため、影響しないこと）
- [ ] `bun run lint` / `bun test` / `bun run typecheck` がグリーンのまま

## Affected areas

- `scripts/export.ts` — Vivliostyle 設定（`vivliostyle.config.cjs`）をインラインで生成している唯一の場所（`scripts/export.ts:121-136`）。現在 `theme` / CSS 指定は一切ない。ここで:
  1. ページ番号用のスタイルシート（`@page { @bottom-center { content: counter(page); } }`）を `EXPORT_DIR`（または `MANUSCRIPT_DIR`）に書き出す
  2. 生成する config に `theme: "./<css>"` を追加する
- `dist/export/<divisionSlug>/` — 生成物（git 管理外の出力先）。構成ファイルとCSSが1つ増える。

コードベース内に既存のエクスポート用 CSS・テーマは存在しない（grep 済み）。Vivliostyle CLI は devDependencies の `@vivliostyle/cli@^9.7.3`。

## Constraints & assumptions

- **Vivliostyle の theme 指定**: config の `theme` プロパティに相対パスで CSS を渡せば全エントリに適用される（Vivliostyle CLI 標準機能）。`entryContext: "./manuscript"` のため、theme パスは config からの相対で解決される。
- **仮定1**: ページ番号は表紙を含む全ページに付与する。Issue は除外を指定しておらず、最小実装とする（表紙除外が必要なら `@page :first { @bottom-center { content: none; } }` を後から足せる）。
- **仮定2**: 番号書式は素の算用数字（`counter(page)`）。「1 / 全N」や「- 1 -」等の装飾は要求されていない。
- **仮定3**: EPUB/webpub にも同じ theme CSS が渡るが、`@page` マージンボックスはページ組版（PDF）でのみ描画されるため実害なし。
- 検証は Playwright 非対応 OS のためシステムブラウザ（`/usr/bin/chromium` 等）で行う（既存の `--executable-browser` フォールバックが対応済み、`scripts/export.ts:141-147`）。

## Acceptance criteria

1. `bun run scripts/export.ts 01-kikai pdf` が成功し、`dist/export/01-kikai/output/01-kikai.pdf` が生成される
2. 生成 PDF の任意のページ下部中央にページ番号が表示される（`pdftotext -layout` またはビューアで目視確認）
3. ページ番号は 1 から始まる通し番号で、ページ順に増加する
4. `bun run lint` / `bun run typecheck` / `bun test` がすべて成功する

## Open questions

なし（表紙のページ番号有無・番号書式は上記の仮定として処理。ブロッキングではない）。
