# 実装計画: 機械部門 令和元年〜6年度 横展開

対象: [analyze.md](./analyze.md)（Issue #1 / slug: `kikai-r01-r06-expansion`）

方針: アプリコード変更なしの純コンテンツ作成。docs/PIPELINE.md の手順（雛形→転記→解答解説→セルフレビュー→機械検証）を年度単位で繰り返す。各年度完了ごとに `bun run validate` を回し、常に green を保つ。

## 進め方の前提

- 作業ブランチ: `feature/kikai-r01-r06`（implement-plan フェーズで作成）
- 各問題の Markdown は r07 の既存10問（`content/second/01-kikai/r07/`）を書式・分量・トーンの手本とする
- PDF はスキャン画像のため Claude が Read で直接読み取り転記する
- 想定文字数: Ⅰ・Ⅲ = 約1800字（3枚）、Ⅱ-1 = 約600字（1枚）、Ⅱ-2 = 約1200字（2枚）
- 各 PDF を開いた時点で実際の問題番号構成を確認し、想定（hisshu 2問 + 0103 8問）と異なればそれに従い、差異を PR 説明に記録する

## Steps

### 準備

- [x] 1. 全年度の雛形を一括生成する
  - `bun run scripts/new-question.ts second 01 <year> hisshu I-1` 〜 各年度 hisshu 2問 + 0103 8問（r01〜r06、計約60ファイル）
  - 変更: `content/second/01-kikai/{r01..r06}/**/*.md`（新規、`status: draft`）
  - 検証: ファイル数を確認（`find content/second/01-kikai/r0[1-6] -name '*.md' | wc -l` → 約60）。この時点では validate は draft を許容することを確認

### 年度ごとの作成（r06 → r01 の新しい順に繰り返し）

各年度 N（r06, r05, r04, r03, r02, r01）について:

- [x] 2. r06: 問題転記（hisshu 2問 + 0103 8問）
  - `data/pdf/second/01-kikai/r06_hisshu.pdf` / `r06_0103.pdf` を Read し、各 md の「## 問題」へ忠実に転記。数式は LaTeX、図表は Mermaid/表、困難な図は `pdftoppm` で `content/second/01-kikai/r06/**/images/` に切り出し
  - frontmatter の title・tags を設定し `status: transcribed`
  - 検証: PDF と目視突合、`bun run validate`
- [x] 3. r06: 模範解答・解説作成 + セルフレビュー
  - 各問題に模範解答（答案形式・指定文字数相当）と解説（出題趣旨→答案のポイント→背景知識、概ね1ページ）を執筆。WebSearch/WebFetch で複数の信頼できる出典を調査し「### 出典・参考文献」に明記 → `status: answered`
  - PIPELINE.md のセルフレビュー4項目を確認し `status: reviewed`
  - 検証: `bun run validate`
- [x] 4. r05: 転記 → 解答解説 → reviewed（手順は r06 と同じ）
- [x] 5. r04: 同上
- [x] 6. r03: 同上
- [x] 7. r02: 同上
- [x] 8. r01: 同上

### 最終検証

- [x] 9. 全体検証・セルフレビュー
  - `bun run validate` 全件パス、`bun test` green、`bun run typecheck`（存在すれば）
  - 開発サーバーまたはビルドで検索 UI に r01〜r06 が現れ、一覧が約70問になることを確認
  - analyze.md の Acceptance criteria 1〜7 を1つずつ照合
  - 差分全体を見直し、転記ミス・出典欠落・status 漏れを修正

## リスクと注意点

- **転記精度**: スキャン品質が低いページは誤読リスクがある。設問番号・下線・句読点まで PDF と突合する。判読不能箇所があれば無理に補完せず PR に明記する。
- **問題数の年度差異**: 想定と異なる構成の年度があれば雛形を追加/削除して追従する（雛形一括生成が先行するため、余剰ファイルの消し忘れに注意）。
- **作業量**: 約60問。年度単位でコミットを分け、中断してもコミット済み年度が無駄にならないようにする。
- **ロールバック**: コンテンツ追加のみでアプリコードに触れないため、問題があっても該当 md の削除/修正で済む。既存 r07 コンテンツと共有ファイルは変更しない。
