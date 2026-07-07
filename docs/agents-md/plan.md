# Plan: AGENTS.md の作成

Source: [analyze.md](./analyze.md)（Issue #2）

成果物はルートの `AGENTS.md` 1 ファイルのみ。コード変更なし。

## Steps

- [ ] **1. AGENTS.md を作成する**
  - 変更ファイル: `AGENTS.md`（新規、リポジトリルート）
  - アプローチ: agents.md 規約準拠のプレーン Markdown・日本語で、以下のセクションを 1〜2 画面程度に収めて記述する。既存ドキュメントの内容はコピーせず要点＋相対リンクで参照する。
    - プロジェクト概要（技術士過去問「問題→模範解答→解説」Web アプリ、**非公開・私的利用限定**）
    - セットアップ・開発コマンド（`make install` / `make dev` / `make check` ほか、Makefile 準拠）
    - 検証手順（作業完了前に `make check` = typecheck + lint + test + validate）
    - 技術スタック・規約（TypeScript / Bun / Biome / React Router v7 Framework mode SSR / bun test）
    - ディレクトリ構成の要点（`app/` `content/` `data/pdf/` `scripts/` `docs/` `tests/`）
    - コンテンツ作業ルール（1問題=1ファイル、frontmatter、status 遷移 draft→transcribed→answered→reviewed、詳細は [docs/PIPELINE.md](../PIPELINE.md)）
    - 環境固有の注意点:
      - 過去問 PDF はスキャン画像（OCR 不可）→ Claude が PDF を直接読んで転記
      - `app/entry.server.tsx` は Bun の制約で `renderToReadableStream` 使用（`renderToPipeableStream` に変えると本番コンテナが起動しない）
      - Playwright 非対応 OS では Vivliostyle がシステムの Chrome/Chromium を自動使用（`scripts/export.ts` 対応済み）
    - 著作権（過去問の著作権は日本技術士会に帰属、非公開・私的利用）
    - ドキュメントリンク（`docs/SPEC.md` / `docs/DESIGN.md` / `docs/PIPELINE.md`）
  - 検証: 記載した make ターゲット・スクリプト名が `Makefile` / `package.json` に実在することを突き合わせる。相対リンクの参照先ファイルが存在することを確認する。

- [ ] **2. ビルド・チェックが green であることを確認する**
  - 変更ファイル: なし
  - アプローチ: `make check`（typecheck + lint + test + validate）を実行。Markdown 追加のみだが、Biome の対象設定によっては AGENTS.md がフォーマットチェックされるため確認する。
  - 検証: `make check` が exit 0

- [ ] **3. セルフレビュー（acceptance criteria 突き合わせ）**
  - 変更ファイル: 必要に応じて `AGENTS.md` を修正
  - アプローチ: analyze.md の Acceptance criteria 1〜6 を 1 項目ずつ確認:
    1. ルートに `AGENTS.md` が存在
    2. 必須セクション（概要/コマンド/検証/スタック/構成/コンテンツ規約/環境注意点/著作権/docs リンク）を網羅
    3. 記載コマンドが実在
    4. 相対リンクが有効
    5. `make check` が成功
    6. 日本語・プレーン Markdown、特定ツール専用ディレクティブなし
  - 検証: 全項目にチェックが付くこと

## Risks / notes

- リスクは低い（ドキュメント 1 ファイルの追加のみ、ロールバックは `git rm AGENTS.md`）。
- 環境注意点（entry.server.tsx / Chrome fallback）は記憶ベースの記述にせず、実ファイル（`app/entry.server.tsx`, `scripts/export.ts`）を確認してから書く。
- README の「ドキュメント」節への AGENTS.md 追記はスコープ外（analyze.md 参照）。
