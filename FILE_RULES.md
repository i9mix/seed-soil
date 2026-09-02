# FILE_RULES.md — ファイル格納ルール

このリポジトリ（seed-soil）のファイル格納場所を定義したルールブックです。
新しいファイルを作成・追加する際は必ずここを参照してください。

---

## リポジトリ全体の構造

```
seed-soil/
├── CLAUDE.md               # Claude（エージェント）への前提知識・指示
├── README.md               # リポジトリの概要説明
├── FILE_RULES.md           # このファイル：格納ルール
├── index.html              # GitHub Pages表示用（dashboard/index.htmlのコピー）
│
├── .agents/                # マルチエージェント設定（自動管理）
├── .claude/                # Claude Code設定（自動管理）
├── .github/                # GitHub Actions設定（自動管理）
│
├── dashboard/              # ダッシュボード（src/ から組み立てて自動生成）
├── governance/             # 会議・意思決定記録
├── docs/                   # 事業ドキュメント
└── talent/                 # 人材要件定義
```

---

## 各フォルダの役割と格納ルール

### `.agents/` — マルチエージェント（触らない）

| フォルダ | 内容 |
|---|---|
| `.agents/agents/` | 各エージェントの定義ファイル（役割・責任・連携先） |
| `.agents/agent-memory/` | 各エージェントのナレッジベース（knowledge.md） |

**ルール：** Claude が自動管理するフォルダ。手動での直接編集は避け、Claude Code 経由で更新する。

---

### `dashboard/` — ダッシュボード（編集するのは `src/` だけ）

ダッシュボードは **断片から組み立てる** 構成です。`template.html` と `index.html` は生成物なので、手で編集しないでください。

```
dashboard/
├── src/                    # ★ 編集するのはここだけ
│   ├── shell.html          # 骨格：ヘッダ・2階層ナビ・フッタ・スクリプト
│   ├── styles.css          # 配色・レイアウト（全タブ共通）
│   └── tabs/               # タブ1枚 = ファイル1つ（14枚）
│       ├── dashboard.html      # 今週のボード
│       ├── progress.html / timeline.html / people.html / meetings.html
│       ├── about.html / verification.html / soil-map.html / hr.html
│       ├── university-analysis.html / general-education.html
│       ├── role-specific.html / research-agenda.html
│       └── pab-plan.html
├── build.mjs               # src/ → template.html を組み立てる
├── generate_dashboard.py   # Slack情報を埋めて index.html を生成する
├── template.html           # 生成物（手で編集しない）
└── index.html              # 生成物（手で編集しない）
```

**タブは4つの層に分かれています。** 層はナビ上段、タブは下段に出ます。

| 層 | 中身 | 更新頻度 |
|---|---|---|
| いま | 今週のボード | 週次（一部は毎朝自動） |
| 進行 | プログラム進捗・スケジュール・関係者マップ・会議資料 | 隔週 |
| 設計 | 事業概要・育成検証企画・①〜⑥ | 随時（低頻度） |
| 案件 | ⑦ PAB企画・制作進行 | 案件ごと |

**ルール：**

- タブの中身を直す → `src/tabs/該当ファイル.html` を編集し、**`cd dashboard && node build.mjs`** を実行する
- 新しいタブを足す → `src/tabs/新ID.html` を作り、`src/shell.html` に `<!--@TAB:新ID-->` とナビのボタン（`data-tab` と `data-layer`）を追加してビルドする
- 新しい案件ページ（イベントの制作進行など）は `案件` 層（`data-layer="case"`）に足す
- 中身を更新したら、そのタブの `data-updated="YYYY-MM-DD"` も必ず直す。60日を超えると自動で「要確認」が出る
- 横断検索はページ上の**文字**を引く。画像に焼いた表や図の中の語は当たらないので、要点はテキストでも書いておく
- `template.html` / `index.html` は GitHub Actions が上書きするため直接編集しない
- `dashboard/` フォルダにドキュメント類を置かない
---

### `governance/` — 会議・意思決定記録

```
governance/
└── meetings/       # 会議資料PDF（アドバイザリーボード定例等）
```

**格納するもの：**
- アドバイザリーボード定例の資料・議事録（PDF）
- その他、意思決定に関わる公式会議の記録

**命名規則：** `第X回_会議名.pdf`（例：`第4回_アドバイザリーボード定例.pdf`）

---

### `docs/` — 事業ドキュメント

```
docs/
├── SEED_デザインシステム.md      # 【マスター】制作物のデザイン基準（配色・角丸・書体・言葉づかい）
├── SEED_PPTデザインシステム.md   # スライド固有の実装詳細（マスターに準拠）
├── sources.md              # 情報ソース一覧・リサーチ出典まとめ
├── organization/           # 組織図・体制図
├── program/                # プログラム設計書
│   ├── playwright/         # 劇作家プログラム関連
│   ├── director/           # 演出家プログラム関連
│   ├── producer/           # プロデューサープログラム関連
│   └── general-education/  # 一般教養講座関連
└── strategy/               # 戦略・方針ドキュメント
```

**格納するもの：**

| フォルダ | 格納ファイルの例 |
|---|---|
| `docs/organization/` | 組織図（pptx/pdf）、体制説明資料 |
| `docs/program/playwright/` | 劇作家向けカリキュラム設計書、募集要項草案 |
| `docs/program/director/` | 演出家向けカリキュラム設計書、海外大学院ベンチマーク資料 |
| `docs/program/producer/` | プロデューサー向けカリキュラム設計書 |
| `docs/program/general-education/` | 一般教養講座の設計書 |
| `docs/program/` (直下) | 3職能横断のプログラム設計書 |
| `docs/strategy/` | 国際展開戦略、SOIL連携方針、事業計画書 |

**ルール：**
- Claude が生成したドキュメント（.md / .docx）はここに格納する
- 職能が特定できる場合は `program/該当職能/` に入れる
- ファイル名に日付を含める場合：`YYYYMMDD_ファイル名`

---

### `talent/` — 人材要件定義

```
talent/
├── research/       # （将来用）リサーチ報告書の生ファイル
└── tobe-models/    # ToBeモデル（3職能の人材要件定義）
```

**格納するもの：**

| フォルダ | 格納ファイルの例 |
|---|---|
| `talent/tobe-models/` | `SEED演出家人材要件ToBeモデル_v2.md` など職能別ToBeモデル |
| `talent/research/` | 海外リサーチャーの報告書、ヒアリング記録 |

**命名規則：** `SEED{職能}人材要件ToBeモデル_v{N}_{変更内容}.md`

---

## ルートに置いてよいファイル

ルートには最小限のファイルのみ置く：

| ファイル | 理由 |
|---|---|
| `CLAUDE.md` | Claude Code が自動的に読み込む |
| `README.md` | GitHub の顔ページ |
| `FILE_RULES.md` | このファイル |
| `index.html` | GitHub Pages の仕様上ルート必須（dashboard/と自動同期） |

**ルール：** ドキュメント・画像・スクリプトをルートに直置きしない。

---

## よくある判断ケース

| 「これ、どこに置く？」 | → 格納先 |
|---|---|
| アドバイザリーボードの会議資料PDF | `governance/meetings/` |
| 演出家プログラムの提案書（docx） | `docs/program/director/` |
| 劇作家の募集要項（md） | `docs/program/playwright/` |
| 演出家ToBeモデルの新バージョン | `talent/tobe-models/` |
| 海外リサーチャーの報告書 | `talent/research/` |
| 事業全体の国際展開戦略 | `docs/strategy/` |
| 組織図の最新版 | `docs/organization/` |
| 一般教養講座のカリキュラム案 | `docs/program/general-education/` |
| ダッシュボードの新タブ追加 | `dashboard/src/tabs/` に追加 → `node build.mjs` |
