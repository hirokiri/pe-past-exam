---
name: run-pe-past-exam
description: Run, build, screenshot, and drive the pe-past-exam web app (技術士過去問 React Router SSR アプリ). Use when asked to run/start the app, take screenshots, smoke-test a change in the real browser, or verify search/detail pages work.
---

# Run: pe-past-exam（技術士過去問題 模範解答解説集）

React Router v7（SSR, Framework mode）+ Bun の Web アプリ。
エージェントはヘッドレスの `/usr/bin/google-chrome` を playwright-core 経由で操作する
ドライバ `.claude/skills/run-pe-past-exam/driver.mjs` で実アプリを駆動する。
パスはすべてリポジトリルートからの相対。

## 前提

- Bun は `~/.bun/bin` にインストール済み。PATH に無ければ:
  ```sh
  export PATH="$HOME/.bun/bin:$PATH"
  ```
- ブラウザは **システムの `/usr/bin/google-chrome`**（この OS では Playwright の
  Chromium ダウンロード不可）。追加インストール不要。
- playwright-core は `@vivliostyle/cli` の推移的依存として node_modules に入る。
  追加インストール不要（ただし Vivliostyle を外すとドライバも壊れる）。
- 依存未導入なら: `bun install`

## 起動 + スモーク（エージェント向け・最優先パス）

```sh
bun run dev &          # 開発サーバー http://localhost:5173（数秒で起動）
bun .claude/skills/run-pe-past-exam/driver.mjs smoke
```

smoke はトップ → 問題検索（70件） → キーワード「振動」で絞り込み（45件）→
先頭の問題詳細（問題/模範解答/解説 の h2 を確認）まで実ブラウザで操作し、
各ステップのフルページスクリーンショットを **`dist/driver-shots/*.png`** に保存。
最後に `SMOKE OK` を出力。件数が変化しない・セクションが無い場合は throw する。

任意ページのスクリーンショット1枚だけ欲しいとき:

```sh
bun .claude/skills/run-pe-past-exam/driver.mjs ss /questions?year=r05 questions-r05
# → dist/driver-shots/questions-r05.png
```

SSR なので DOM 確認だけなら curl でも足りる:

```sh
curl -s 'http://localhost:5173/questions?q=%E6%8C%AF%E5%8B%95' | grep -o '<p class="result-count">[^<]*'
# → <p class="result-count">45
```

## 本番ビルドの確認

```sh
bun run build          # build/ に生成（~1秒）
bun run start &        # react-router-serve, http://localhost:3000
bun .claude/skills/run-pe-past-exam/driver.mjs smoke http://localhost:3000
```

ドライバは第2引数（ss は第3引数）で baseURL を受ける。省略時は :5173。

## 人間向けパス

`make dev` → http://localhost:5173 をブラウザで開く。ヘッドレス環境では無意味。

## テスト・検証

```sh
bun test                              # ユニットテスト（14件, <1s）
bun run scripts/validate-content.ts   # コンテンツ Markdown の機械検証
make check                            # typecheck + lint + test + validate
```

## Gotchas

- **React Router のクライアントサイド遷移は URL が先、DOM が後。**
  フォーム送信後に URL だけ待って `.result-count` を読むと絞り込み前の値
  （70件のまま）を掴む。ドライバは件数テキストの変化まで
  `waitForFunction` で待つ実装になっている。新しい操作を足すときも
  `waitForURL` だけで満足しないこと。
- **`app/entry.server.tsx` は `renderToReadableStream` を使う。**
  Bun ランタイムに `renderToPipeableStream` が無いため。Node 流に
  「修正」すると本番コンテナが起動しなくなる。
- Chrome 起動には `--no-sandbox --disable-gpu` が必要（ドライバに設定済み）。
- PDF/EPUB 出力（`make export`）も同じ理由でシステム Chrome を使う。
  `scripts/export.ts` が `--executable-browser` を自動指定するので手当不要。

## Troubleshooting

| 症状 | 対処 |
| --- | --- |
| `bun: command not found` | `export PATH="$HOME/.bun/bin:$PATH"` |
| smoke が「filtered: 70件」等で throw / 詳細ページの h1 が「問題検索」 | 遷移の待ち不足。driver.mjs の waitForFunction/waitForURL パターンを踏襲する |
| Playwright が Chromium を落とそうとして失敗 | 使わない。`executablePath: "/usr/bin/google-chrome"` を指定（ドライバ参照） |
