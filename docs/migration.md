# Supabase CLI マイグレーションガイド（FrontMate MVP）

このガイドは、Supabase CLI を用いて MVP スキーマをあなたの Supabase プロジェクトに適用する手順です。

## 前提条件
- Supabase プロジェクトが作成済みでアクセス可能である
- CLI をインストール: `brew install supabase/tap/supabase`（macOS）または https://supabase.com/docs/guides/cli を参照
- ログイン: `supabase login`（ブラウザが開き、アクセストークンを取得）

## 初回セットアップ（プロジェクトのリンク）
1) リポジトリのルートで、プロジェクトをリンクします:

```
supabase link --project-ref <your-project-ref>
```

ヒント:
- Project Ref は `abcd1234efghij...` のような形式です。Supabase ダッシュボードの Project Settings で確認できます。
- 明示的な DB URL を使いたい場合は、リンクの代わりに `--db-url` を使えます。例:

```
export SUPABASE_DB_URL="postgresql://postgres:<password>@db.<host>.supabase.co:5432/postgres"
supabase db push --db-url "$SUPABASE_DB_URL"
```

## MVP スキーマの適用
`docs/db-schema.sql` を反映した初期マイグレーションを追加済みです:
- `supabase/migrations/20241103_init_mvp.sql`

リンク済みプロジェクトに対して、保留中のマイグレーションを実行します:

```
supabase db push
```

これにより、テーブル／ENUM／インデックス／トリガー／`v_conversation_inbox` ビューの作成と、全テーブルでの RLS 有効化が行われます。

### 本リポジトリの Project Ref
`.env` の `NEXT_PUBLIC_SUPABASE_URL` から推測される Project Ref は次のとおりです:

```
mueohogmztsnypvfzfqt
```

そのため、以下で直接リンクできます:

```
supabase link --project-ref mueohogmztsnypvfzfqt
supabase db push
```

## RLS ポリシー
このマイグレーションでは RLS は有効化されていますが、ポリシー自体はデフォルトでは作成されません。テナントメンバーシップ（`tenant_members`）に基づいてアクセス範囲を制御するポリシーを作成してください。最小例:

```
-- tenant_members: 自分のメンバーシップを読み取れる
create policy tenant_members_select on public.tenant_members
  for select using (auth.uid() = user_id);

-- テナント単位のテーブルに適用するパターン（テーブル毎に繰り返し適用）
-- 対象: conversations, messages, knowledge_base, templates, stats_daily, worker_logs
create policy tenant_read on public.conversations
  for select using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = conversations.tenant_id and m.user_id = auth.uid()
    )
  );

create policy tenant_write on public.conversations
  for insert with check (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = conversations.tenant_id and m.user_id = auth.uid()
    )
  );

create policy tenant_update on public.conversations
  for update using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = conversations.tenant_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = conversations.tenant_id and m.user_id = auth.uid()
    )
  );
```

上記を SQL Editor に貼り付けて実行するか、追従マイグレーションを作成します:

```
supabase migration new rls_policies
# 生成された SQL にポリシー文を追加し、
supabase db push
```

## ローカル開発
- 任意で `supabase start` によりローカル Postgres を起動し、ローカルにマイグレーションを適用:

```
supabase db reset   # すべてのマイグレーションをリセットして適用
```

## 本番運用のヒント
- まずステージング環境で `supabase db push` を実行して検証することを推奨します。
- `tenants` に保存するシークレット（例: `hmac_shared_secret`）はクライアントへ公開しないでください。サーバ側のみでアクセスします。
- 公開受信エンドポイント（`/api/public/messages`）は、API ルートで service role を使う（RLS をバイパス）か、専用ポリシー付きのスコープを絞った Postgres 関数経由にしてください。

## トラブルシューティング
- `ERROR:  relation "auth.users" does not exist`:
  - Supabase 管理のプロジェクト（`auth.users` を含む）を利用してください。
- `permission denied for table ...`:
  - RLS ポリシーと認証コンテキストを確認。サーバルートでは service role key を使用。
- ポリシーの論理ミス:
  - `exists(...)` 内で対象テーブルの別名/識別子を正しく修飾しているか確認してください（上記例を参照）。
