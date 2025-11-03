FrontMate MVP 機能要件（Markdown版）

スコープを「管理画面」と「チャットボット（ユーザー側）」に分割。データは Supabase、オーケストレーションは n8n を使用。
目標：導入30分で運用開始、送信→10秒以内に自動返信、履歴可視化。

⸻

0. 前提
	•	フロント：Next.js (App Router, TypeScript)
	•	認証/DB/Storage：Supabase（RLS有効）
	•	自動処理：n8n（Webhook → 分類 → ナレッジ参照 → 返信生成）
	•	通信：Edge API + SSE（または Supabase Realtime）
	•	Bot対策：Turnstile / レート制限（per tenant）

⸻

1. 管理画面（Admin Console）

1.1 認証
	•	Supabase Auth（Email + OTP / Magic Link）
	•	ログイン/ログアウト
	•	RLS で 所属テナントのデータのみ閲覧可

1.2 ナレッジ/テンプレ管理
	•	手動インプットで回答素材を登録
	•	会社情報 / 営業時間 / 料金・サービス / FAQ
	•	テンプレ返信（採用 / 見積 / FAQ / 営業）
	•	Markdown/テキスト入力、保存・更新

1.3 問い合わせ管理
	•	一覧（Inbox）：件名、カテゴリ、優先度、日時、未読/既読
	•	詳細：スレッド（user/assistant）、メタ情報、手動返信（MVP+でも可）
	•	[TEST] バッジ：管理画面テスト会話の識別（集計除外）

1.4 ダッシュボード
	•	問い合わせ件数（棒グラフ）：直近7/30日
	•	問い合わせ傾向（カテゴリ比率）：採用/見積/FAQ/営業/その他
	•	高優先率：priority_score >= 80 の割合
	•	集計は is_test = false のみ対象

1.5 管理画面内チャットテスト
	•	管理画面からメッセージ送信 → 本番と同じ n8n フローで返信
	•	is_test = true で保存（ダッシュボード集計から除外）
	•	SSE でリアルタイム受信

1.6 基本設定
	•	テナント名
	•	n8n 連携用共有シークレット（HMAC）
	•	埋め込みコード生成（<script> / <iframe>）

⸻

2. チャットボット（ユーザー側）

2.1 設置方法
	•	埋め込み：<script>（Shadow DOM）または <iframe>
	•	CSP/外部JS制限がある場合は iframe フォールバック
	•	専用URL：/chat/[tenant]（SNSプロフィール/リンクから遷移）
	•	?utm_* / topic / prefill を受け取り初期化

2.2 ユーザーフロー
	1.	送信 → POST /api/public/messages
	2.	Edge API が Supabase に保存 → n8n Webhook 起動
	3.	n8n：分類 → ナレッジ/テンプレ参照 → 返信生成 → 保存
	4.	POST /api/internal/reply → SSE でフロントへ配信

2.3 セキュリティ/安定化
	•	Turnstile + IP/tenant レート制限
	•	n8n→Next は HMAC 署名必須
	•	返信失敗時は 定型フォールバックで応答

⸻

3. データモデル（要旨）
	•	tenants(id, name, plan_tier, created_at)
	•	tenant_members(tenant_id, user_id, role) … RLSの基準
	•	conversations(id, tenant_id, subject, channel, source, is_test, category, priority_score, status, meta, created_at, updated_at)
	•	messages(id, conversation_id, role, content, meta, created_at)
	•	knowledge_base(id, tenant_id, type, title, content, meta, updated_at)
	•	templates(id, tenant_id, category, title, body, enabled, updated_at)
	•	stats_daily(tenant_id, d, count_total, count_by_category) … 夜間集計

※ すべて tenant_id で RLS。is_test = true は集計除外。

⸻

4. API エンドポイント（MVP）

公開（受信）
	•	POST /api/public/messages
	•	入力：{ tenantId, text, meta(utm_*, topic, ip, ua) }
	•	処理：保存 → n8n 起動 → 受領レスポンス

内部（n8n→Next）
	•	POST /api/internal/reply（HMAC署名）
	•	入力：{ conversationId, text, category?, priority_score?, is_test? }
	•	処理：保存 → SSE でクライアントへ

管理画面・会話
	•	GET /api/conversations?status=&cursor=&limit=
	•	GET /api/conversations/:id
	•	PATCH /api/conversations/:id（status/category/priority_score）
	•	POST /api/conversations/:id/reply（手動返信：MVP+でも可）

管理画面・ナレッジ/テンプレ
	•	GET /api/knowledge?type=
	•	POST /api/knowledge / PATCH /api/knowledge/:id
	•	GET /api/templates?category=
	•	POST /api/templates / PATCH /api/templates/:id

管理画面・ダッシュボード
	•	GET /api/dashboard/summary?range=7d|30d
	•	出力：日次件数、カテゴリ比率、高優先率、平均初回応答秒

管理画面・チャットテスト
	•	POST /api/admin/test-messages（認証必須、is_test=true）
	•	GET /api/admin/test-sse?conversationId=...（SSE）

埋め込みコード
	•	GET /api/embed/snippet?type=script|iframe

⸻

5. n8n フロー（MVP）

F1: 受信→回答
	1.	Webhook(in)：{ conversationId, lastUserText, is_test }
	2.	Supabase 取得：knowledge_base / templates
	3.	分類：ルール + 軽量 LLM → category（採用/見積/FAQ/営業/その他）
	4.	合成：テンプレ（Handlebars）＋ナレッジ差し込み
	5.	生成：LLM（敬体/禁止語チェック）
	6.	保存：messages(assistant)、conversations 更新
	7.	返信：POST /api/internal/reply（HMAC）

F2: 日次集計
	•	messages をロールアップし stats_daily 更新（is_test=false のみ）

⸻

6. 非機能要件（MVP）
	•	性能：初回返信 10秒以内（LLM待ち含む目標）
	•	可用性：99.9% 目標（n8nダウン時のフォールバック文あり）
	•	セキュリティ：RLS、HMAC、Turnstile、IPレート制限、XSS対策
	•	ログ/監査：n8nエラーを Supabase（簡易 logs）へ保存
	•	UX：スマホ最適（埋め込み/専用URLともにレスポンシブ）

⸻

7. Done 条件（受け入れ基準）
	•	管理画面にログインし、ナレッジ/テンプレ登録ができる
	•	ユーザー送信 → 自動返信が10秒以内に返る（SSE表示）
	•	送受信履歴が conversations/messages に保存される
	•	ダッシュボードで 件数（棒）/カテゴリ比率 が表示される
	•	管理画面から チャットテストができ、集計には含まれない
	•	RLS により他テナントのデータは取得できない

⸻

8. 環境変数（最小）
	•	NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
	•	SUPABASE_SERVICE_ROLE_KEY（サーバ専用）
	•	N8N_INBOUND_WEBHOOK_URL
	•	N8N_OUTBOUND_SHARED_SECRET（HMAC）
	•	TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY

⸻

9. リリース手順（4週間想定）
	1.	W1：スキーマ & RLS / Auth / /api/public/messages
	2.	W2：n8n F1 / /api/internal/reply / Inbox（一覧・詳細）
	3.	W3：ナレッジ/テンプレ UI / 管理画面テスト / レート & Turnstile
	4.	W4：ダッシュボード / 日次集計 / 埋め込みコード生成
