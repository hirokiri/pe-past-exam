# 実装計画: ページヘッダーにダウンロードボタンを付与

前提: `docs/header-download-buttons/analyze.md`。
ブランチ: `feature/header-download-buttons`（worktree で作業）。

## 方針サマリ

- ダウンロード配信は React Router のリソースルート
  `GET /downloads/:division/:format`（format = `pdf` | `epub` | `html`）で行い、
  `dist/export/<division>/output/` の事前生成物をストリーミング返却する。
- HTML(webpub) はディレクトリのため、**export 時に** `output/<division>-html.zip`
  を生成しておき（`scripts/export.ts` に ZIP 化ステップを追加、システムの
  `/usr/bin/zip` を使用）、ランタイムは単にファイルを返すだけにする。
  ランタイムに zip 依存を持ち込まない。
- ヘッダーのボタンは現状唯一のコンテンツ部門 `01-kikai` 固定
  （ルート側は `:division` でパラメータ化済みのため将来拡張可能）。

## 手順

### 1. リソースルートの追加

- [x] **`app/routes/download.ts` を新規作成し、`app/routes.ts` にルート登録する**
  - `route("downloads/:division/:format", "routes/download.ts")`
  - loader の仕様:
    - `params.division` を `/^[a-z0-9-]+$/i` で検証。不一致は 404
      （パストラバーサル対策。受入基準6）。
    - `params.format` → ファイル解決:
      - `pdf` → `dist/export/<division>/output/<division>.pdf`, `application/pdf`
      - `epub` → 同 `.epub`, `application/epub+zip`
      - `html` → 同 `<division>-html.zip`, `application/zip`
      - それ以外の format は 404。
    - ファイル不存在は `throw new Response("Not Found", { status: 404 })`
      （受入基準4: 500 にしない）。
    - 存在すれば `Bun.file()`（`node:fs` の `createReadStream` でも可、
      Bun/Node 互換に注意 — vite dev は Node ベースなので
      `node:fs` の stream を `Response` に包む方が安全）でストリーミング返却。
      ヘッダー: `Content-Type`, `Content-Length`,
      `Content-Disposition: attachment; filename="..."`。
  - 検証: `bun run typecheck` が通ること。dev サーバーで
    `curl -sw "%{http_code}" -o /dev/null http://localhost:5173/downloads/01-kikai/pdf`
    が 200（成果物あり）/ 404（なし）を返すこと。

### 2. export スクリプトの ZIP 化対応

- [x] **`scripts/export.ts` に webpub の ZIP 化を追加する**
  - vivliostyle build 成功後、`webpub` フォーマットが含まれる場合に
    `output/<division>-html/` を `output/<division>-html.zip` に固める
    （`Bun.spawn(["zip", "-r", "-q", zipPath, dirName], { cwd: outputDir })`。
    `zip` 不在時はエラーメッセージを出して非ゼロ終了ではなく警告に留める —
    PDF/EPUB のダウンロードは影響を受けないため）。
  - 検証: `make export DIVISION=01-kikai FORMATS=webpub` 実行後に
    `dist/export/01-kikai/output/01-kikai-html.zip` が存在し、
    `unzip -l` で `index.html`（webpub の publication 構成）が見えること。
    ※ フル export は headless Chrome が必要なため、環境的に不可なら
    ダミーディレクトリで ZIP 化ロジック単体を手動検証する。

### 3. ヘッダー UI

- [x] **`app/root.tsx` のヘッダーにダウンロードボタン群を追加する**
  - `.site-header` の `nav` 内（「問題を探す」の後）に
    `<a href="/downloads/01-kikai/pdf">PDF</a>` / EPUB / HTML の 3 リンクを追加。
    リソースルートへの遷移は SPA ナビゲーションではないため `Link` ではなく
    素の `<a>`（`download` 属性付与）を使う。
  - ラベルは「PDF」「EPUB」「HTML」に「ダウンロード」の文脈が分かる
    グルーピング（例: `<span>ダウンロード:</span>`）を添える。
  - 検証: 3 ルート（`/`, `/questions`, `/questions/:id`）すべてで表示される
    （Layout 共通なので 1 画面で確認 + スクリーンショット）。

- [x] **`app/app.css` にボタンスタイルを追加する**
  - `.download-links`（gap の flex）と小型ボタン風リンク
    （既存 `.button-primary` のトーンに合わせた控えめなボタン。
    `--border` / `--fg-muted` 変数を再利用）。
  - モバイル幅でヘッダーが折り返しても崩れないこと（`flex-wrap`）。
  - 検証: run-pe-past-exam スキルでスクリーンショットを取り目視確認。

### 4. ドキュメント・デプロイ考慮

- [x] **README にダウンロード導線を追記し、Containerfile の制約を明記する**
  - README「出力（HTML / PDF / EPUB）」節に、生成済み成果物は
    ヘッダーのボタン（`/downloads/<division>/<format>`）から
    ダウンロードできる旨を追記。
  - Containerfile の runtime ステージは `build/` と `content/` しか
    コピーしないため、コンテナ内では成果物が存在せず 404 になる。
    `COPY dist/expor[t] ./dist/export`（glob により不存在でも成功する
    Docker イディオム）を追加して、事前生成済みならイメージに含める。
  - 検証: README の記述レビュー。コンテナビルドは任意
    （ローカル運用が主のため）。

### 5. テスト・検証パス

- [x] **loader のユニットテストを追加する（`tests/download.test.ts`）**
  - division バリデーション（`../` や `..%2F` デコード後の値が 404）、
    format 分岐、不存在ファイルの 404 を、`dist/export` を一時ディレクトリに
    差し替え可能な形（またはフィクスチャ）でテスト。
    loader をルートファイルから import して直接呼ぶ。
  - 検証: `bun test` green。

- [x] **最終検証 & self-review**
  - `bun run typecheck` / `bun run lint` / `bun test` すべて green。
  - dev サーバー起動し、受入基準 1〜6 を curl とブラウザで確認
    （run-pe-past-exam スキル使用）。
  - `/self-review header-download-buttons` を実施。

## リスク・注意点

- **vite dev と本番の実行環境差**: dev は Node(Vite) 上、
  本番は Bun(`react-router-serve`) 上で loader が動く。`Bun.file` は dev で
  使えないため、`node:fs`（`statSync` + `createReadStream` → `Response`）で
  実装して両対応にする。ここが最も踏み抜きやすい。
- **成果物の巨大化**: `Content-Length` を付けつつストリーミングにすることで
  メモリ常駐を避ける（受入基準の非機能要件）。
- **ロールバック**: 変更はルート追加・UI 追加・export スクリプト追記のみで
  独立性が高い。問題があればコミット単位で revert 可能なよう、
  ステップ 1+2（配信基盤）とステップ 3（UI）は別コミットにする。

## 受入基準トレーサビリティ

| analyze.md 受入基準 | 対応ステップ |
| --- | --- |
| 1. 全ページに 3 ボタン表示 | 3 |
| 2. PDF/EPUB が attachment でダウンロード | 1 |
| 3. HTML が ZIP でダウンロード | 1, 2 |
| 4. 未生成時 404（500 にしない） | 1, 5 |
| 5. curl で 200/404 確認 | 5 |
| 6. パストラバーサルが 404 | 1, 5 |
| 7. typecheck / lint / test green | 5 |
