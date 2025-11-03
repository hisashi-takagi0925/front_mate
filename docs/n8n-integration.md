# n8n 連携設計（FrontMate）

## 目的
Next.js フロント（ウィジェット/管理画面）から n8n ワークフローを中核バックエンドとして利用するための設計指針と I/F を定義します。

## 基本方針
- Next.js は薄い API シェル（検証・署名・CORS 対応）として動作し、n8n Webhook にフォワード。
- n8n がビジネスロジック（分類/返信生成/通知/外部連携/永続化）を実装。
- セキュリティ: Webhook Secret、API Key、HMAC 署名、IP 制限の併用を推奨。

## 必須環境変数（Next.js）
- `N8N_CHAT_WEBHOOK_URL` … チャット受付 Webhook URL（例: `https://n8n.example.com/webhook/chat-ingest`）
- `N8N_API_KEY` … n8n 側で検証する任意の共有鍵（`Authorization: Bearer` で送信）

## ワークフロー一覧（推奨）
1) Chat Ingest（Webhook）
   - 入力: `{ sessionId, messages:[{role, content}], meta?:{source, siteId} }`
   - 処理: 前処理 → 分類 → テンプレ/ナレッジ参照 → 返信生成 → アクション → ログ保存 → 通知
   - 出力: `{ message:{role:'assistant', content}, category, confidence, priorityScore, actions? }`
2) Template CRUD（Webhook）
   - `GET /templates`, `POST /templates`, `PUT /templates/:id`, `DELETE /templates/:id`
   - ストレージ: Notion/Google Sheets/DB のいずれかに保存
3) Sources Sync（Webhook or Cron）
   - URL/スプレッドシートのクロール/同期、要約/埋め込み作成
4) Escalation（Webhook）
   - 失敗/曖昧応答時のメール/Slack 通知

## 代表ペイロード
- リクエスト
```json
{
  "sessionId": "anon-123",
  "messages": [
    { "role": "user", "content": "採用について教えて" }
  ],
  "meta": { "source": "web", "siteId": "site_abc" }
}
```
- レスポンス
```json
{
  "message": { "role": "assistant", "content": "採用の流れは…" },
  "category": "recruiting",
  "confidence": 0.82,
  "priorityScore": 72,
  "actions": [ { "type": "propose_schedule", "slots": ["2025-11-01T10:00Z"] } ]
}
```

## n8n ノード設計メモ
- 分類: Function/Code ノード + LLM ノード（安全辞書/正規表現 → モデル）
- 返信生成: LLM ノード（RAG: HTTP Request でベクトル検索 or 外部API）
- テンプレ適用: Set/Code ノードで変数展開
- 日程調整: Google Calendar ノード（空き取得/予定作成）
- 永続化: Database ノード or Google Sheets/Notion
- 通知: Slack/Email ノード
- 監視: エラー分岐 → エスカレーション WF 呼び出し

## エラーハンドリング/リトライ
- Next.js 側: 4xx 入力エラー/5xx n8n 障害を区別し、`retry-after` を付与
- n8n 側: 失敗時は Dead Letter（スプレッドシート等）に記録し、再試行

## 将来の拡張
- ストリーミング応答: n8n で段階出力が難しいため、段階的メッセージ設計 or ポーリング/API Gateway 併用
- 認証: 管理系 Webhook は Basic 認証 + IP 制限

