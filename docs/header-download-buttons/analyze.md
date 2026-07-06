# 分析: ページヘッダーにダウンロードボタンを付与

## Source

- Issue: https://github.com/hirokiri/pe-past-exam/issues/8 (#8)
- タイトル: ページヘッダーにダウンロードボタンを付与
- 本文: 「Webページのヘッダーにpdf/epub/htmlでダウンロードするためのボタンを配置する。」
- slug: `header-download-buttons`

## Goal

Web アプリの全ページ共通ヘッダー（`app/root.tsx` の `.site-header`）に、コンテンツを
PDF / EPUB / HTML の各形式でダウンロードできるボタンを配置する。
ユーザーがブラウザからワンクリックで `make export` 相当の成果物を入手できれば「done」。

## 現状の把握（コードベース）

- アプリは React Router v7 SSR（`react-router-serve`、Bun 環境）。ルートは
  `app/routes.ts` に 3 つ（home / questions / questions/:id）のみ。
- 共通ヘッダーは `app/root.tsx` の `Layout` にあり、サイトタイトルと
  「問題を探す」ナビリンクのみ。スタイルは `app/app.css` の `.site-header`
  （flex, space-between）と `.button-primary` が既存。
- 出力物は `scripts/export.ts`（`make export DIVISION=01-kikai`）が
  Vivliostyle CLI で生成し、`dist/export/<division>/output/` に置かれる:
  - `<division>.pdf` — 単一ファイル
  - `<division>.epub` — 単一ファイル
  - `<division>-html/` — webpub **ディレクトリ**（単一ファイルではない）
- `build/` は `react-router build` が消すため export 先に使えない
  （export.ts 冒頭コメントに明記）。`public/` はビルド時に `build/client` へ
  コピーされる静的アセット置き場。
- コンテンツは現在 `content/second/01-kikai/` の 1 部門のみ。
  部門一覧は `app/lib/taxonomy.ts` の `DIVISIONS` に定義済み。
- 生成には headless Chrome が必要（Playwright 非対応 OS ではシステムの
  Chromium を自動使用）。Web ビルドとは独立した重い処理。

## Requirements

機能要件:

- [ ] 全ページ共通ヘッダーに PDF / EPUB / HTML の 3 つのダウンロードボタンを表示する
- [ ] PDF ボタン → `dist/export/<division>/output/<division>.pdf` をダウンロードできる
- [ ] EPUB ボタン → 同 `.epub` をダウンロードできる
- [ ] HTML ボタン → webpub ディレクトリ一式を ZIP としてダウンロードできる
- [ ] 対応する export 成果物がサーバー上に存在しない場合は 404 を返す
  （リンク自体は常に表示してよい — 私的利用サイトのため運用でカバー）

非機能要件:

- [ ] `bun run typecheck` / `bun run lint` / `bun test` が green のまま
- [ ] ダウンロード配信はストリーミングで行い、ファイル全体をメモリに載せない
  （PDF は数十 MB になりうる）
- [ ] 既存のヘッダーレイアウト（モバイル幅含む）を崩さない

## Affected areas

| 対象 | 変更内容 |
| --- | --- |
| `app/root.tsx` | ヘッダーにダウンロードボタン群を追加 |
| `app/routes.ts` | ダウンロード用リソースルートを追加（例: `downloads/:division/:format`） |
| `app/routes/download.ts`（新規） | loader で `dist/export/<division>/output/` からファイルを配信。HTML は ZIP 化 |
| `app/app.css` | ボタンのスタイル追加（`.site-header` 内） |
| `README.md` | ダウンロード導線の説明を 1 行追記（任意） |

## Constraints & assumptions

- **部門スコープ**: export は部門単位なので、ダウンロードも部門単位とする。
  現状コンテンツは `01-kikai` のみのため、ヘッダーのボタンは `01-kikai` を
  対象とする。ルートは `:division` パラメータ化して将来の部門追加に備える。
- **成果物は事前生成**: PDF/EPUB 生成は headless Chrome を要する重い処理のため、
  リクエスト時のオンデマンド生成は行わない。`make export` で事前生成された
  `dist/export/` の成果物を配信する方式とする。
- **HTML 形式は ZIP**: webpub は複数ファイルのディレクトリであり単一ファイル
  ダウンロードにできないため、ZIP アーカイブとして配信する（Bun 環境のため
  `zip` コマンドや軽量実装で対応。生成結果はキャッシュしてよい）。
- **配信方法はリソースルート**: `public/` へのコピー運用ではなく、React Router の
  リソースルート（loader がファイルを Response で返す）を採用する。
  dev / production 双方で同一パスで動作し、ビルドに依存しない。
- パストラバーサル対策として `:division` は `dist/export/` 直下の実在
  ディレクトリ名（英数字とハイフン）に限定して検証する。
- サイトは非公開・私的利用（footer に明記）のため、認可制御は不要。

## Acceptance criteria

1. すべてのページ（`/`, `/questions`, `/questions/:id`）のヘッダーに
   PDF / EPUB / HTML の 3 ボタンが表示される。
2. export 成果物が存在する状態で PDF ボタンを押すと、`Content-Type:
   application/pdf` かつ `Content-Disposition: attachment` で
   `01-kikai.pdf` がダウンロードされる。EPUB も同様
   （`application/epub+zip`）。
3. HTML ボタンを押すと webpub 一式が ZIP（`application/zip`）で
   ダウンロードされ、展開すると `index.html` 等が含まれる。
4. 成果物が未生成の場合、該当 URL は 404 を返す（500 にならない）。
5. `curl -o /dev/null -w "%{http_code}" http://localhost:<port>/downloads/01-kikai/pdf`
   等で 200/404 を確認できる。
6. `../` を含む division 指定（例: `/downloads/..%2F..%2Fetc/pdf`）が
   404 になる。
7. `bun run typecheck` / `bun run lint` / `bun test` がすべて成功する。

## Open questions

ブロッキングなし。以下は仮定として処理:

- ボタンの対象部門: 現状唯一の `01-kikai` 固定（ルートはパラメータ化）。
- HTML の配布形態: ZIP（issue は「html でダウンロード」とのみ記載）。
- 成果物未生成時の挙動: リンクは表示し、404 を返す。
