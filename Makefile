# 開発時に有用なコマンド集
# 前提: bun がインストール済み（https://bun.sh）

DIVISION ?= 01-kikai
FORMATS  ?= pdf,epub,webpub

.PHONY: help install dev build start test typecheck lint lint-fix check \
        validate download-pdfs new-question export \
        container-build container-up container-dev container-down

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## 依存パッケージをインストール
	bun install

dev: ## 開発サーバーを起動 (http://localhost:5173)
	bun run dev

build: ## 本番ビルド
	bun run build

start: ## 本番ビルドを起動 (http://localhost:3000)
	bun run start

test: ## ユニットテストを実行
	bun test

typecheck: ## 型チェック
	bun run typecheck

lint: ## Lint・フォーマットチェック
	bun run lint

lint-fix: ## Lint・フォーマットを自動修正
	bun run lint:fix

check: typecheck lint test validate ## CI相当の全チェック

validate: ## コンテンツMarkdownを検証
	bun run scripts/validate-content.ts

download-pdfs: ## 公式サイトから過去問PDFを取得（sources.json 記載分）
	bun run scripts/download-pdfs.ts

new-question: ## 問題雛形を生成 例: make new-question ARGS="second 01 r07 hisshu I-1"
	bun run scripts/new-question.ts $(ARGS)

export: ## 部門単位でPDF/EPUB/HTMLを生成 例: make export DIVISION=01-kikai FORMATS=pdf
	bun run scripts/export.ts $(DIVISION) $(FORMATS)

container-build: ## コンテナイメージをビルド
	podman build -t pe-past-exam -f Containerfile .

container-up: ## 本番相当コンテナを起動 (http://localhost:3000)
	podman compose up app

container-dev: ## 開発モードコンテナを起動 (http://localhost:5173)
	podman compose up dev

container-down: ## コンテナを停止・削除
	podman compose down
