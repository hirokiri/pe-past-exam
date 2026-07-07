# 技術士過去問題 模範解答解説集

技術士試験の過去問題について「問題 → 模範解答 → 解説」の構成（小問のある問題は設問ごとにこの順で記載）で閲覧できる Web アプリケーションです。コンテンツは部門単位で HTML / PDF / EPUB に出力できます。

> **著作権・公開範囲**: 過去問題の著作権は公益社団法人日本技術士会に帰属します。本システムは**非公開・私的利用**に限定しています。

## 現在の収録範囲（MVP）

- 技術士第二次試験 機械部門
  - 必須科目Ⅰ
  - 選択科目 0103 機構ダイナミクス・制御
  - 令和元年度〜令和7年度（段階的に拡充中）

## 技術スタック

- TypeScript / Bun / Biome
- React Router v7（Framework mode, SSR）
- コンテンツ: リポジトリ内 Markdown（frontmatter 付き）
- 出力: Vivliostyle CLI（PDF / EPUB / webpub）
- コンテナ: Podman
- デプロイ: GCP Cloud Run（TODO・今後実装）

## セットアップ

```sh
# Bun のインストール（未導入の場合）
curl -fsSL https://bun.sh/install | bash

make install   # 依存パッケージのインストール
make dev       # 開発サーバー起動 → http://localhost:5173
```

`make help` で全コマンドを確認できます。主なもの:

| コマンド | 内容 |
| --- | --- |
| `make dev` | 開発サーバー起動 |
| `make check` | typecheck + lint + test + コンテンツ検証 |
| `make export DIVISION=01-kikai` | 部門単位で PDF/EPUB/HTML を生成 |
| `make download-pdfs` | 公式サイトから過去問 PDF を取得 |
| `make new-question ARGS="second 01 r07 hisshu I-1"` | 問題 Markdown の雛形生成 |
| `make container-up` | Podman で本番相当コンテナを起動 |

## ディレクトリ構成

```txt
app/        React Router アプリ本体（ルート・ローダ・検索）
content/    コンテンツ Markdown（1問題=1ファイル）
data/pdf/   ダウンロードした過去問題 PDF と出典一覧
scripts/    パイプラインスクリプト（取得・雛形・検証・出力）
docs/       SPEC.md（要件定義）/ DESIGN.md（設計）/ PIPELINE.md（コンテンツ生成手順）
tests/      bun test ユニットテスト
```

## コンテンツの追加

過去問 PDF の取得から模範解答・解説の作成、検証までの手順は [docs/PIPELINE.md](docs/PIPELINE.md) を参照してください。概要:

1. `make download-pdfs` — 公式サイトから PDF 取得（`sources.json` に出典を記録）
2. `make new-question ARGS="..."` — frontmatter 付き雛形を生成
3. Claude が PDF から問題文を転記し、文献調査のうえ模範解答・解説を執筆
4. セルフレビュー後 `make validate` で機械検証

## 出力（HTML / PDF / EPUB）

```sh
make export DIVISION=01-kikai            # 3形式すべて
make export DIVISION=01-kikai FORMATS=pdf
```

`dist/export/<division>/output/` に生成されます。生成済みの成果物は Web アプリのヘッダーにあるダウンロードボタン（`/downloads/<division>/<format>`、format は `pdf` / `epub` / `html`）からダウンロードできます（HTML は webpub 一式の ZIP）。PDF 生成には Vivliostyle が使用するヘッドレスブラウザ（初回に自動ダウンロード）が必要です。Playwright が対応していない OS では、システムにインストール済みの Google Chrome / Chromium（`/usr/bin/google-chrome` など）を自動的に使用します。

## ドキュメント

- [docs/SPEC.md](docs/SPEC.md) — 要件定義
- [docs/DESIGN.md](docs/DESIGN.md) — 設計（アーキテクチャ・データモデル・出力パイプライン）
- [docs/PIPELINE.md](docs/PIPELINE.md) — コンテンツ生成パイプライン
