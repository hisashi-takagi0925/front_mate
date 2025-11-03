# FrontMate 機能設計書（チャットボット／管理画面）

## 目的・範囲
- 本書は FrontMate の中核である「チャットボット機能」と「管理画面」の機能要件・画面構成・主要APIを定義します。
- 本リポジトリは Next.js 16 + TypeScript 構成を前提とし、最小実装は App Router で提供します。

## システム構成（概観）
- フロント: 埋め込みチャットウィジェット（`public/widget.js`）/ 管理画面（Next.js App Router）。
- バックエンド: n8n ワークフロー（Webhook エントリ）を中核とし、Next.js は薄いプロキシ/API シェル。
- データ層: 会話ログ、テンプレート、ナレッジソース（登録URL/スプレッドシート）、連携設定。
- 外部サービス: Slack/Notion/Google カレンダー/メール送信（SMTP or provider）/SNS（将来拡張）。

---

## チャットボット機能
### n8n 連携方針
- 入口: `POST /api/chat` → Next.js で受付 → n8n Webhook にフォワード。
- n8n 側で「前処理→分類→返信生成→アクション→ログ保存→通知」を実行し、最終レスポンスを JSON で返却。
- 認証: Next.js→n8n は HMAC 署名 or API Key（ヘッダ）で保護。Webhook は IP 制限/Secret を使用。
### 対応チャネル
- Web ウィジェット（HP 埋め込み）：`<script src="/widget.js" defer>` で起動。
- SNS/メッセージング（LINE/Instagram/Slack/Email）は将来拡張。共通会話エンジンを使用。

### 会話フロー（標準）
1) ユーザー入力受信 → 2) 前処理（PII マスキング/正規化）
→ 3) 分類（採用/依頼/営業/FAQ/その他）
→ 4) 回答生成（テンプレート適用 + ナレッジ/RAG）
→ 5) 追加アクション（カレンダー候補提示/差し戻し）
→ 6) 応答送信（ストリーミング対応）
→ 7) ログ保存・優先度スコア更新・通知
→ 8) 不可判定時は自動エスカレーション（メール/Slack）。

### 分類とルーティング
- ルール + モデル併用。最低限キーワード/正規表現でガード、モデルで補完。
- 出力: `category`（採用/依頼/営業/FAQ/その他）、`confidence`、`priorityScore`。
- ルーティング例: `採用` → `テンプレート:採用`、`依頼` → `日程調整`、`営業` → `自動辞退テンプレ`。

### 返信生成
- ソース: 登録URL/スプレッドシートをクロール/同期し、要約スニペットを RAG で参照。
- テンプレート: 変数 `{name}`, `{company}`, `{slots}` をサポート。ポリシーで敬語/トーン統一。
- フォールバック: 不確実性が高い場合は「確認します」応答 + エスカレーション。

### 日程調整（任意）
- Google カレンダー連携時、空き枠 API で候補を生成し、ユーザー選択 → 予定作成。

### セッション/ストリーミング
- セッション: 匿名 `sessionId`（Cookie/Storage）で会話スレッドを紐づけ。
- ストリーミング: SSE または Fetch + ReadableStream。UI はトークン逐次描画。

### エスカレーション
- 条件: `confidence < 閾値`、NG キーワード、ユーザー要請、SLA 超過。
- 宛先: メール（To: オーナー）、Slack（チャネル通知）。会話コンテキストを添付。

### 主要 API（Next.js シェル）
- `POST /api/chat`（`app/api/chat/route.ts`）
  - Next.js でバリデーション/署名付与後、`N8N_CHAT_WEBHOOK_URL` にフォワード。
  - 入力: `{ sessionId, messages:[{role, content}], meta?:{source} }`
  - 出力: n8n 応答を透過返却（`{ message, category, confidence, priorityScore, actions? }`）。
- 管理系は必要に応じて `/api/templates` `/api/sources` を n8n の対応 Webhook にプロキシ。

### データモデル（概要）
- Conversation: `id, sessionId, channel, createdAt, updatedAt, priorityScore`。
- Message: `id, conversationId, role, content, tokens, meta`。
- Template: `id, name, category, body, variables[]`。
- Source: `id, type(url|sheet), url, status, lastSyncedAt`。
- Integration: `id, kind(slack|notion|gcal|email), credentials(meta)`。

---

## 管理画面（Management UI）
### ナビゲーション/情報設計
- ダッシュボード（KPI/未対応数/今日のタスク）。
- 受信箱（会話一覧、フィルタ：カテゴリー/優先度/チャネル）。
- 会話詳細（メッセージタイムライン、再分類、テンプレ送信、エスカレーション、メモ）。
- テンプレート管理（一覧/作成/プレビュー、変数定義）。
- ナレッジソース（URL/スプレッドシート登録、同期ステータス、手動再クロール）。
- 連携設定（Slack/Notion/Google カレンダー/メール）。
- 設定（営業時間、SLA、NGワード、トーン、署名）。
- メンバー/権限（Owner/Member）。

### 代表画面の挙動
- 受信箱
  - 既定並び: `priorityScore desc, updatedAt desc`。
  - バルク操作: ラベル付け、担当者アサイン、ステータス変更（未対応/保留/完了）。
- 会話詳細
  - 右ペイン: コンテキスト（分類、確信度、ソース引用、推奨テンプレ）。
  - アクション: 返信作成（テンプレ適用→編集→送信）、再分類、日程提案、エスカレーション。
- テンプレート
  - 変数のプレビュー・検証、カテゴリとの紐付け、A/B テストフラグ。

### 権限/監査
- 権限: Owner（全権）/Member（会話操作・閲覧、設定は閲覧のみ）。
- 監査ログ: 重要操作（テンプレ変更、連携設定、削除）を記録。

### 画面配置（Next.js 例）
- `app/(admin)/dashboard/page.tsx`
- `app/(admin)/inbox/page.tsx`, `app/(admin)/inbox/[id]/page.tsx`
- `app/(admin)/templates/page.tsx`
- `app/(admin)/sources/page.tsx`
- `app/(admin)/integrations/page.tsx`
- `app/(admin)/settings/page.tsx`

---

## 非機能要件
- セキュリティ: 入力検証、レート制限、CORS、CSRF（同一オリジン POST のみ許可）、認証（将来: NextAuth など）。
- パフォーマンス: P95 応答<2.5s、ストリーミング初回トークン<800ms 目標。
- 可用性: エスカレーションは冪等/再試行可能に。外部API障害時はフォールバック応答。
- ロギング/観測: 会話IDで相関、分類/確信度/コスト（トークン）を計測、エラー通知。
- プライバシー: PII マスキング/保持期間/削除権。学習/保存の同意管理。

## KPI/運用
- 初回応答時間、解決率、エスカレーション率、SLA 遵守率、返信漏れゼロ、テンプレ活用率。
- モデルトーン逸脱・不適切検知のレートをウォッチし、プロンプト/ルールの継続改善。

## 実装メモ（このリポジトリ）
- Next.js は n8n へのプロキシを実装（`/api/chat` 他）。環境変数: `N8N_CHAT_WEBHOOK_URL`, `N8N_API_KEY`（任意）。
- ウィジェット: `public/widget.js` で起動/送信/受信をカプセル化。`data-site-id` を受け取り `/api/chat` へ送信。
- 型: `types/` に DTO/レスポンス型を定義（生成ファイルは編集不可）。
- Lint/品質: `npm run lint` を PR の必須チェック。将来 `vitest` 導入時は `vitest run --coverage` を追加。
