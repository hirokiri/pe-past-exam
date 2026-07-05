# Analyze: AGENTS.md の作成

## Source

- Issue: <https://github.com/hirokiri/pe-past-exam/issues/2>（#2「AGENTS.md」）
- 本文: 「AGENTS.mdを作成する。」
- Slug: `agents-md`

## Goal

AI コーディングエージェント（Claude Code など）がこのリポジトリで作業する際に必要な前提・コマンド・規約・環境上の注意点を 1 ファイルで提供する `AGENTS.md` をリポジトリルートに作成する。[agents.md](https://agents.md/) のオープン規約（README のエージェント版。特定ツールに依存しない Markdown）に沿った内容とし、既存ドキュメント（README / docs/SPEC.md / docs/DESIGN.md / docs/PIPELINE.md）と重複させず参照でつなぐ。

「done」の状態: リポジトリルートに `AGENTS.md` が存在し、エージェントが README や docs を全部読まなくても、開発コマンド・検証手順・コンテンツ規約・環境固有の落とし穴を把握して安全に作業を始められる。

## Requirements

機能要件:

- [ ] リポジトリルートに `AGENTS.md` を作成する
- [ ] プロジェクト概要（技術士過去問の「問題→模範解答→解説」Web アプリ、非公開・私的利用）を短く記載
- [ ] セットアップ・開発コマンド（`make install` / `make dev` / `make check` など Makefile 準拠）を記載
- [ ] コミット前・作業完了前の検証手順（`make check` = typecheck + lint + test + validate）を明記
- [ ] 技術スタックと規約（TypeScript / Bun / Biome / React Router v7 SSR、`bun test`）を記載
- [ ] ディレクトリ構成の要点（app / content / data/pdf / scripts / docs / tests）を記載
- [ ] コンテンツ作業のルール（1問題=1ファイル、frontmatter、status 遷移 draft→transcribed→answered→reviewed、詳細は docs/PIPELINE.md 参照）を記載
- [ ] 環境固有の注意点を記載:
  - 過去問 PDF はスキャン画像で OCR 不可 → Claude が PDF を直接読んで転記する
  - `app/entry.server.tsx` は Bun ランタイムの制約で `renderToReadableStream` を使用（変更禁止の旨）
  - Playwright 非対応 OS ではシステムの Chrome/Chromium を Vivliostyle が自動使用（scripts/export.ts 対応済み）
- [ ] 著作権上の制約（日本技術士会に帰属、非公開・私的利用限定）を明記
- [ ] 既存ドキュメント（SPEC / DESIGN / PIPELINE）への参照リンクを張る

非機能要件:

- [ ] 日本語で記述（リポジトリ内ドキュメントと統一）
- [ ] README・docs の内容をコピーせず、エージェントに必要な要点＋リンクに絞る（1〜2 画面程度）
- [ ] 特定エージェント専用の記法を使わない（agents.md 規約準拠のプレーン Markdown）

## Affected areas

- `AGENTS.md`（新規作成、リポジトリルート）— 唯一の成果物
- 参照元（変更しない）: `README.md`, `Makefile`, `package.json`, `docs/SPEC.md`, `docs/DESIGN.md`, `docs/PIPELINE.md`, `app/entry.server.tsx`, `scripts/export.ts`
- 任意: `README.md` の「ドキュメント」節に AGENTS.md への言及を追加するか → 今回はスコープ外とする（Issue は AGENTS.md 作成のみ）

## Constraints & assumptions

- Issue 本文が 1 行のため、内容は agents.md の一般規約と本リポジトリの既存ドキュメント・メモリ（環境注意点）から構成する（仮定）
- 言語は日本語（リポジトリの他ドキュメントがすべて日本語のため。仮定）
- 配置はリポジトリルートのみ（サブディレクトリ用のネスト AGENTS.md は現規模では不要。仮定）
- CLAUDE.md は存在しない。AGENTS.md をシンボリックリンク等で CLAUDE.md に兼用させる対応は行わない（Issue に指示がないため。仮定）
- コード変更を伴わないため、ビルドへの影響なし。`make check` が引き続き green であることのみ確認する

## Acceptance criteria

1. `AGENTS.md` がリポジトリルートに存在する
2. 上記 Requirements の必須項目（概要 / コマンド / 検証 / スタック / 構成 / コンテンツ規約 / 環境注意点 / 著作権 / docs リンク）をすべて含む
3. 記載コマンドが実在する（Makefile / package.json のターゲットと一致し、handoff 前に実行確認）
4. docs への相対リンクが有効（リンク切れなし）
5. `make check` が成功する（既存コードへの影響なし）
6. 日本語・プレーン Markdown で、特定ツール専用ディレクティブを含まない

## Open questions

なし（ブロッキングな不明点はなし。上記の仮定で進める）
