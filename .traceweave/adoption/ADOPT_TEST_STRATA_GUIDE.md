# 導入プロジェクト向け 工程別テスト構成ガイド

TraceWeave adopt 後に、**一般的な Web システム開発**（ブラウザ UI + バックエンド API + 永続化）を想定したテストの役割分担と、TraceWeave の 5 大工程（UT / ITa / ITb / ST / UAT）への映射を示します。

本書は「このツールをこの工程に当てはめる」という固定レシピではなく、**各工程で何を証明すべきか**を先に決め、自動化はそのオラクルに最も近いハーネスを選ぶための参照です。プロジェクトのドメイン・リスク・リリース頻度に合わせて厚みを調整してください。

関連: `docs/ADOPT_QUALITY_SETUP.md`（TC 結合・CI）、TraceWeave 用語 `docs/glossary/GLO-0002.md`（工程地層）、`.traceweave/examples/config.web-application.fragment.json`（スイート設定例）。

---

## 1. 想定するシステム構成（サンプル）

典型的な 3 層 Web アプリケーションを adopt の「場面」として固定します。

```text
┌─────────────┐     HTTPS      ┌──────────────────┐     HTTP      ┌─────────────┐
│  Web クライアント │ ────────────► │  API / BFF サーバー │ ────────────► │  RDB / キャッシュ │
│  (SPA 等)    │ ◄──────────── │  (REST/GraphQL)   │ ◄──────────── │             │
└─────────────┘                └──────────────────┘               └─────────────┘
         │                                │
         │                                └── 認証・認可、ドメインロジック、永続化
         └── 画面遷移、入力検証、API 呼び出し
```

### リポジトリ配置の例（overlay 採用時）

既存構造を維持する overlay では、次のような分割が TraceWeave と相性が良いです（必須ではありません）。

| パス | 役割 |
|---|---|
| `apps/web/` または `frontend/` | SPA（React / Vue 等） |
| `apps/api/` または `backend/` | REST API サービス |
| `docs/` | NEED / REQ / SPEC / TC（TraceWeave V 字） |
| `tests/` または各 app 内 `*.test.ts` | UT / ITa 主体 |
| `postman/` または `tests/api/` | ITb（HTTP 契約）用コレクション |
| `tests/e2e/` | ST / UAT のブラウザ自動化 |
| `reports/` | カバレッジ・`test-results.json`（証跡） |
| `.traceweave/config.json` | 複数テストスイートの集約 |

---

## 2. 5 大工程で「何を」検証するか

TraceWeave の `test_level` と TC ID 接頭辞の対応は次のとおりです。

| 工程 | TraceWeave `test_level` | TC ID | 一般的な検証目的 |
|---|---|---|---|
| 単体 | `unit` | `TC-UT-` | 最小単位の仕様・分岐・不変条件。外部 I/O は切り離す |
| 内部結合 | `integration_internal` | `TC-ITa-` | **同一デプロイ単位内**のモジュール連携（ユースケース + リポジトリ等） |
| 外部結合 | `integration_external` | `TC-ITb-` | **プロセス・ネットワーク・ファイル・DB** など外部境界を跨ぐ契約 |
| システム | `system` | `TC-ST-` | 要求環境に近い形での**業務シナリオ**（複数機能の縦断） |
| 受入 | `acceptance` | `TC-UAT-` | **受入基準（REQ の AC）** に基づく投入可否の判断 |

### 2.1 単体（UT）

**証明すること**

- ドメインルール、バリデーション、計算、状態遷移（純粋関数・単一クラス）
- 異常系・境界値（REQ の AC を細分化したオラクル）

**典型ハーネス（言語ごと）**

- TypeScript / JavaScript: Vitest, Jest, Node.js `node:test`
- Python: pytest, unittest
- Go: `go test`
- Java: JUnit

**TraceWeave**

- TC 文書: `verifies` で REQ / SPEC（単体は DSN のみ可、REQ-0031 参照）
- 自動化: テストタイトル行頭 `TC-UT-xxxx:`（`.cursor/rules/test-writing-guidelines.mdc`）
- コードカバレッジ（C0/C1）は **単体層の実装網羅**指標。要件充足度（トレーサビリティスコア）とは別（GLO-0083）

### 2.2 内部結合（ITa）

**証明すること**

- アプリケーション層が複数内部モジュールを正しい順序で呼ぶこと
- インメモリ / フェイク実装での永続化・時刻・ID 生成との連携
- HTTP や実 DB を起動**しない**範囲の「配線」検証

**典型ハーネス**

- 単体と同じランナー（プロセス内）。Testcontainers や実 DB は **ITb 側**に寄せるのが一般的

**TraceWeave**

- TC 本文（Steps）は **契約・観測可能な振る舞い**（SPEC-0029 / ADR-0012）。モック構成や内部型名は書かない
- 自動化: `TC-ITa-xxxx:` を同一 Node（等）スイートで宣言

**よくある誤り**

- 「結合テスト = Newman」だけに寄せる。Newman は **HTTP 公開面**向けで、モジュール内結合の主戦場ではない

### 2.3 外部結合（ITb）

**証明すること**

- REST / GraphQL **公開 API** のステータスコード、ボディ、ヘッダ、エラー契約（SPEC に対応）
- CLI、ファイル入出力、メッセージング、サードパーティ API（サンドボックス）
- テスト用 DB・スキーママイグレーションを含む **I/O 境界**

**典型ハーネス**

- HTTP: Newman + Postman コレクション、REST Client + 自前レポータ、Pact（契約）、Supertest（同一プロセス内 HTTP だが **公開契約**として ITb に置くことも多い）
- DB: Testcontainers、Docker Compose 上の依存サービス

**TraceWeave**

- Newman 等: コレクション項目名を `TC-ITb-xxxx: …` とし、`.traceweave/config.json` の `newman-api` スイート（formal）で fragment 集約
- Node 内 Supertest: `TC-ITb-xxxx:` 宣言行 + `node` スイート

### 2.4 システム（ST）

**証明すること**

- ステージング相当環境での**業務シナリオ**（ログイン → 業務操作 → 結果確認）
- フロント + API + DB が揃った状態での非機能の一部（タイムアウト、主要フローの可用性）

**典型ハーネス**

- Playwright, Cypress（ブラウザ E2E）
- シナリオ API のみの場合は Postman Collection Runner（ただし UI 要件がある ST はブラウザを正本に）

**TraceWeave**

- ブラウザ DOM がオラクル: `tests/e2e/*.spec.ts` + Playwright、`e2e` スイート（formal）
- `tests/support/**` の静的解析だけで ST を passed にしない（ADR-0011）

### 2.5 受入（UAT）

**証明すること**

- ステークホルダー合意の **受入基準**（REQ の AC をそのままオラクルに）
- 本番投入可否の判断材料（探索的テスト、デモ、署名付きチェックリストを含む）

**典型ハーネス**

- クリティカルパス: Playwright + Gherkin（Cucumber 等）で `TC-UAT-xxxx:` を自動化
- 残り: 手動実行 + 証跡（チケット、スクリーンショット、`parameter_file` 連携）

**TraceWeave**

- TC 文書は必ず `verifies` で REQ（AC）に紐づける
- 手動 UAT は `test_method: exploratory_manual` 等を検討。自動化不能な Steps は TC に残し、証跡は運用で補完

---

## 3. 工程 × サンプル Web 構成 × 推奨ハーネス

| 工程 | サンプル Web でのテスト対象 | 推奨ハーネス（第一候補） | TraceWeave スイート例 |
|---|---|---|---|
| UT | API のドメインサービス、フロントの pure util / reducer | Vitest / Jest / pytest | `node`（formal） |
| ITa | API 内「ユースケース + リポジトリ（フェイク）」 | 同一ランナー、プロセス内 | `node`（formal） |
| ITb | `/api/v1/...` OpenAPI 契約、認証ヘッダ、エラーレスポンス | Newman または Supertest | `newman-api` または `node` |
| ST | 「会員登録 → ログイン → 注文」等の縦断シナリオ | Playwright（`apps/web` 対象） | `e2e`（formal） |
| UAT | REQ-xxx の AC-001 をそのまま再現するシナリオ | Playwright（重要経路）+ 手動 | `e2e` + 手動証跡 |

---

## 4. テストピラミッドと TraceWeave 充足度

一般的な健全形は **UT を厚く、ST/UAT を薄く**（GLO-0003）。TraceWeave の充足度スコアは REQ の `criticality` ごとに工程配点が異なります（`USER_GUIDE.md` 6.2 節）。

- **High**: UT + ITa + ITb（または ST）+ UAT の組み合わせで 80 点以上が目安
- **Medium**: UT + 結合または ST で 80 点以上
- **Low**: いずれか 1 工程の TC があれば充足

ピラミッド診断（`get_stratum_density` / ダッシュボード）で **逆コーン**（E2E 偏重）や **中間層の空洞**（ITa/ITb 欠落）を早めに検知してください。

---

## 5. `.traceweave/config.json` の考え方

複数ランナーを **suite** として定義し、`./bin/traceweave test` で `reports/test-results.json` にマージします。

| `evidenceTier` | 意味 |
|---|---|
| `formal` | TC ID キーがダッシュボードの実行結果に載る（既定） |
| `supplementary` | 走らせてよいが証跡に載せない（`tests/support/**`、`support:` タイトル） |

Web サンプル向けの fragment 例: `.traceweave/examples/config.web-application.fragment.json`

**最小構成（UT のみから開始）**

1. `node` スイート + `traceweave-capture-test-report.mjs`
2. REQ が API 契約を持つ SPEC が増えたら `newman-api` または ITb の Node テストを追加
3. UI の ST/UAT が固まったら `e2e`（Playwright）を追加

---

## 6. TC 文書と自動テストの接続（再掲）

1. **静的（V 字）**: `docs/test-cases/TC-xxxx.md` の `verifies` → REQ / SPEC
2. **動的（実行）**: テストタイトルまたは Newman 項目名の `TC-xxxx` → `reports/test-results.json`

内結以上の TC 本文は **利用者が実行できる手順**として書き、実装詳細は DSN / テストコード側に置きます。

---

## 7. 導入時チェックリスト（要約）

- [ ] 各 REQ の AC が、少なくとも 1 つの TC（適切な `test_level`）に分解されている
- [ ] UT はドメインと SPEC の純粋契約を厚くカバーし、lcov を `reports/` に出力している
- [ ] API 公開面は ITb で SPEC 契約を検証している（Newman は **その一例**）
- [ ] 業務シナリオは ST（E2E）で少数精鋭
- [ ] UAT は REQ の AC と 1 対 1（または分割 TC `-01`）で追跡できる
- [ ] `./bin/traceweave check` と `./bin/traceweave test` が CI で回る（`ADOPT_QUALITY_SETUP.md`）

---

## 8. アンチパターン

| パターン | 問題 | 対処 |
|---|---|---|
| E2E だけで UT/ITa を省略 | 遅い・脆い・原因特定困難 | UT/ITa を厚くし E2E はクリティカル経路のみ |
| Newman のみで「全部結合」 | モジュール内の欠陥を見逃す | ITa をプロセス内、ITb を HTTP/IO に分離 |
| `support:` テストに `TC-` を付けて formal 扱い | 証跡が水増しされる | ADR-0011 に従い tier を分離 |
| カバレッジ率だけで品質判断 | 要件未充足のまま合格に見える | トレーサビリティマトリクスと地層密度を併用 |

---

## 9. 他アーキテクチャへの読み替え

| 構成 | UT / ITa | ITb | ST / UAT |
|---|---|---|---|
| BFF + マイクロサービス | 各サービス内 | サービス間 API、イベント | 契約テスト + 少数 E2E |
| モバイル + API | 各ネイティブ UT | API 契約（Newman 等） | デバイス / クラウド E2E |
| バッチ / CLI ツール | ジョブロジック UT | ファイル I/O、CLI 終了コード | 本番相当データでの ST |

読み替えても **工程の定義（何をどの境界で証明するか）** は変えず、ハーネスだけ差し替えてください。
