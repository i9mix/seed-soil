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
├── dashboard/              # ダッシュボード自動生成システム
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

### `dashboard/` — ダッシュボード（触るファイルを限定する）

| ファイル | 役割 |
|---|---|
| `template.html` | **唯一の編集対象**。タブ構成・静的コンテンツはすべてここに書く |
| `generate_dashboard.py` | Slack情報を取得してindex.htmlを生成するスクリプト |
| `index.html` | 自動生成されるファイル。手動編集禁止 |

**ルール：**
- 新しいタブを追加する → `template.html` を編集
- `index.html` は GitHub Actions が自動上書きするため直接編集しない
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
| ダッシュボードの新タブ追加 | `dashboard/template.html` を編集 |
