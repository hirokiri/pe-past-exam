# 分析: 第二次試験 機械部門 令和元年〜6年度 横展開

## Source

- GitHub Issue: <https://github.com/hirokiri/pe-past-exam/issues/1>（Issue #1）
- タイトル: 第二次試験機会部門令和元年〜6年度横展開（「機会」は「機械」の表記ゆれと解釈）
- slug: `kikai-r01-r06-expansion`

## Goal

現在 令和7年度（r07）のみ収録している機械部門の問題・模範解答・解説（必須科目Ⅰ + 選択科目0103 機構ダイナミクス・制御、計10問、全て `status: reviewed`）を、既に PDF 取得済みの令和元年度〜令和6年度（r01〜r06）にも横展開する。

「done」の状態: r01〜r06 の各年度について、必須科目Ⅰと選択科目0103 の全問題が `content/second/01-kikai/<year>/` 配下に Markdown として存在し、問題転記・模範解答・解説を備えて `status: reviewed` に達し、`bun run validate` とテストが green であること。

## Requirements

機能要件（docs/PIPELINE.md のパイプラインに従う）:

- [ ] r01〜r06 × {hisshu, 0103} の全問題の雛形を `scripts/new-question.ts` で生成する
- [ ] 各問題文をスキャン PDF（`data/pdf/second/01-kikai/rNN_{hisshu,0103}.pdf`）から Claude が直接読み取り、忠実に転記する（数式は LaTeX、図表は Mermaid/Markdown テーブル、再現困難な図は `pdftoppm` で切り出して `content/**/images/` へ）
- [ ] 各問題に模範解答（本試験の答案形式・指定文字数相当）と解説（概ね1ページ: 出題趣旨→答案のポイント→背景知識）を作成する
- [ ] 模範解答・解説は信頼できる Web ページ・論文・白書等を複数調査し、「### 出典・参考文献」に明記する
- [ ] セルフレビュー後 `status: reviewed` にする

非機能要件:

- [ ] `bun run validate`（frontmatter・id/パス整合・セクション順序・status 検証）が全件パスする
- [ ] 既存テスト（`bun test`）が green のまま
- [ ] 原文の表記（漢字・かな・句読点・箇条書き番号）を保った転記

## Affected areas

- `content/second/01-kikai/r01/` 〜 `r06/`（新規、各年度 `hisshu/` + `0103/`）— 変更の本体。**アプリコードの変更は不要**
- `data/pdf/second/01-kikai/r01_*.pdf` 〜 `r06_*.pdf` — 取得済み（12ファイル）。読み取り元
- `app/lib/taxonomy.ts` — r01〜r06 は定義済み。変更不要
- `scripts/new-question.ts` / `scripts/validate-content.ts` — 年度非依存の汎用実装。変更不要
- 検索・絞り込み UI — content から動的に導出されるため変更不要（追加コンテンツで年度フィルタに r01〜r06 が現れることを確認）

## Constraints & assumptions

- PDF はスキャン画像でテキスト抽出・OCR 不可。転記は Claude が PDF を Read して行う（memory / PIPELINE.md）。
- 令和元年度の試験制度改正以降、出題構成は毎年同一と想定: 必須Ⅰ = Ⅰ-1, Ⅰ-2 の2問、選択0103 = Ⅱ-1-1〜Ⅱ-1-4, Ⅱ-2-1, Ⅱ-2-2, Ⅲ-1, Ⅲ-2 の8問 → **1年度10問 × 6年度 = 約60問**。実際の問題数は各 PDF を開いて確認し、差異があればそれに従う（想定であり仕様ではない）。
- 対象科目は r07 と同じ hisshu + 0103 のみ（SPEC.md の当初範囲どおり）。0101 等の他選択科目は対象外。
- 60問の高品質な調査付き解答作成は大規模なため、実装は年度単位で段階的に進め、各年度完了ごとに validate を回す。成果は1つの draft PR にまとめる（Issue が単一のため）。
- 模範解答の文字数目安: 必須Ⅰ・Ⅲは答案用紙3枚（約1800字）、Ⅱ-1は1枚（約600字）、Ⅱ-2は2枚（約1200字）相当。
- Web 調査には WebSearch/WebFetch を用いる（ネットワークアクセス前提）。

## Acceptance criteria

1. `content/second/01-kikai/{r01..r06}/hisshu/` に各2問、`{r01..r06}/0103/` に各年度の全選択問題（想定8問）の Markdown が存在する。
2. 全新規ファイルが frontmatter 完備（id・year・yearLabel・sourcePdf・title・tags 等）で `status: reviewed`。
3. 各ファイルが「## 問題 → ## 模範解答 → ## 解説」の順序を持ち、解説内に「### 出典・参考文献」があり複数出典を明記している。
4. 問題文が原文 PDF と一致している（表記・設問番号・下線などの強調を保持）。
5. `bun run validate` が全件成功する。
6. `bun test` が green。
7. Web アプリの検索・絞り込みで r01〜r06 の問題が表示される（一覧件数が 10 → 約70 に増える）。

## Open questions

なし（ブロッキングな不明点はない。問題数の年度差異は PDF 確認時に吸収する）。
