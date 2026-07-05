# AGENTS.md

AI コーディングエージェント向けの作業ガイド。詳細は各ドキュメント（[docs/SPEC.md](docs/SPEC.md)・[docs/DESIGN.md](docs/DESIGN.md)・[docs/PIPELINE.md](docs/PIPELINE.md)）を参照。

## プロジェクト概要

技術士試験の過去問題を「問題 → 模範解答 → 解説」の構成で閲覧できる Web アプリケーション。コンテンツは部門単位で HTML / PDF / EPUB に出力できる。

> **著作権**: 過去問題の著作権は公益社団法人日本技術士会に帰属する。本システムは**非公開・私的利用限定**。問題文やコンテンツを外部に公開しないこと。

## 技術スタック

- TypeScript / Bun（ランタイム・テスト） / Biome（lint・format）
- React Router v7（Framework mode, SSR）
- コンテンツ: リポジトリ内 Markdown（frontmatter 付き、1問題 = 1ファイル）
- 出力: Vivliostyle CLI（PDF / EPUB / webpub）
- コンテナ: Podman

## コマンド

```sh
make install   # 依存パッケージのインストール
make dev       # 開発サーバー起動 → http://localhost:5173
make check     # typecheck + lint + test + コンテンツ検証（CI相当）
make lint-fix  # Biome による自動修正
```

その他は `make help` を参照（`make export`・`make download-pdfs`・`make new-question` など）。

**作業完了前に必ず `make check` を実行し、green であることを確認すること。**

## ディレクトリ構成

```txt
app/        React Router アプリ本体（routes/ ルート、lib/ ローダ・検索・型）
content/    コンテンツ Markdown（content/<exam>/<division>/<year>/<subject>/<番号>.md）
data/pdf/   ダウンロードした過去問題 PDF と出典一覧（data/pdf/<exam>/<division>/sources.json）
scripts/    パイプラインスクリプト（取得・雛形・検証・出力）
docs/       SPEC.md（要件）/ DESIGN.md（設計）/ PIPELINE.md（コンテンツ生成手順）
tests/      bun test ユニットテスト
```

## コンテンツ作業のルール

手順の詳細は [docs/PIPELINE.md](docs/PIPELINE.md)。要点:

- 過去問 PDF はスキャン画像（フォント情報なし）で OCR 不可。**問題文の転記はエージェントが PDF を直接読み取って行う**。原文の表記を忠実に保ち、数式は LaTeX、図表は Mermaid / Markdown テーブルで再現する。再現困難な図・写真は PDF から画像を切り出して `content/**/images/` に保存し、相対パスで参照する。
- 模範解答は本試験の答案形式（指定文字数 600〜1800 字相当の記述式論文）とする。信頼できる文献を複数調査し、「出典・参考文献」に明記する。解説は概ね1ページ。
- frontmatter の `status` は `draft → transcribed → answered → reviewed` の順に遷移させる。`reviewed` にするのは PIPELINE.md のセルフレビューチェックリストを満たしてから。
- 作成・編集後は `bun run validate`（`make check` に含まれる）で機械検証する。

## 環境固有の注意点

- `app/entry.server.tsx` は Bun ランタイムに `renderToPipeableStream` がないため `renderToReadableStream` を使用している。**Bun で動かす限り変更しないこと**（`renderToPipeableStream` に変えると本番コンテナが起動しなくなる）。
- Playwright が対応していない OS では Vivliostyle の同梱ブラウザを取得できないため、`scripts/export.ts` がシステムの Chrome / Chromium（`/usr/bin/google-chrome` など）を `--executable-browser` で自動使用する（対応済み・変更不要）。
- この開発環境では Bun は `~/.bun/bin` にインストールされている。`bun` が見つからない場合は `export PATH="$HOME/.bun/bin:$PATH"` を試す。バージョン管理は mise（`mise.toml`）。
