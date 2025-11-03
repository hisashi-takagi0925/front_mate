-- FrontMate MVP Database Schema (Supabase/PostgreSQL)
-- Based on docs/MVP.md section 3 (データモデル)
-- Safe to run multiple times (IF NOT EXISTS used where possible)

-- Extensions
create extension if not exists pgcrypto;

-- =========================
-- Enums
-- =========================
do $$ begin
  create type plan_tier as enum ('free','pro','enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner','admin','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_status as enum ('open','pending','resolved','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('user','assistant','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type knowledge_type as enum ('company_info','hours','pricing','faq','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type template_category as enum ('hiring','quote','faq','sales','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type channel as enum ('web','admin_test','api');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_category as enum ('hiring','quote','faq','sales','other');
exception when duplicate_object then null; end $$;

-- =========================
-- Core tables
-- =========================

-- tenants: organization/space
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier plan_tier not null default 'free',
  -- For embedding/public routing (not a secret, can be shown in embed code)
  public_embed_token text unique not null,
  -- n8n outbound HMAC shared secret (store as text; restrict via RLS/policies)
  hmac_shared_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_created_at_idx on public.tenants(created_at desc);

-- tenant_members: link auth.users to tenants
create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members(user_id);

-- conversations: one per user thread
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject text,
  channel channel not null default 'web',
  source text, -- e.g., 
  is_test boolean not null default false,
  category inquiry_category, -- set by classifier (nullable until assigned)
  priority_score int,
  status conversation_status not null default 'open',
  -- Timestamps for inbox logic
  first_user_message_at timestamptz,
  last_user_message_at timestamptz,
  last_assistant_message_at timestamptz,
  -- updated on admin view to derive unread (last_user_message_at > last_opened_at)
  last_opened_at timestamptz,
  -- UTM, topic, ip, ua, etc.
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_tenant_created_idx on public.conversations(tenant_id, created_at desc);
create index if not exists conversations_tenant_status_idx on public.conversations(tenant_id, status, created_at desc);
create index if not exists conversations_tenant_category_idx on public.conversations(tenant_id, category);
create index if not exists conversations_priority_idx on public.conversations(tenant_id, priority_score desc nulls last);
create index if not exists conversations_is_test_idx on public.conversations(tenant_id, is_test);

-- messages: ordered chat messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role message_role not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at asc);

-- knowledge_base: tenant-provided knowledge snippets
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type knowledge_type not null,
  title text not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_tenant_type_idx on public.knowledge_base(tenant_id, type);
create unique index if not exists knowledge_tenant_title_idx on public.knowledge_base(tenant_id, title);

-- templates: reply templates per category
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category template_category not null,
  title text not null,
  body text not null,
  enabled boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_tenant_category_idx on public.templates(tenant_id, category, enabled);
create unique index if not exists templates_tenant_title_idx on public.templates(tenant_id, title);

-- stats_daily: nightly rollups (is_test = false only)
create table if not exists public.stats_daily (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  d date not null,
  count_total int not null default 0,
  -- JSON object like { "hiring": 12, "quote": 4, ... }
  count_by_category jsonb not null default '{}'::jsonb,
  avg_first_reply_seconds numeric(10,2),
  primary key (tenant_id, d)
);

create index if not exists stats_daily_tenant_d_idx on public.stats_daily(tenant_id, d desc);

-- optional: simple logs for n8n errors (non-critical for MVP, but referenced in non-functional reqs)
create table if not exists public.worker_logs (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  source text not null, -- e.g., 'n8n', 'edge', 'sse'
  level text not null check (level in ('debug','info','warn','error')),
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists worker_logs_tenant_created_idx on public.worker_logs(tenant_id, created_at desc);

-- =========================
-- Triggers for updated_at
-- =========================
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists set_updated_at_tenants on public.tenants;
create trigger set_updated_at_tenants before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_conversations on public.conversations;
create trigger set_updated_at_conversations before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_knowledge on public.knowledge_base;
create trigger set_updated_at_knowledge before update on public.knowledge_base
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_templates on public.templates;
create trigger set_updated_at_templates before update on public.templates
for each row execute function public.set_updated_at();

-- =========================
-- RLS scaffolding (policies to be applied in Supabase)
-- =========================
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.templates enable row level security;
alter table public.stats_daily enable row level security;
alter table public.worker_logs enable row level security;

-- Suggested policies (create in Supabase SQL editor or migrations):
-- 1) tenant_members: members can view their memberships
--   create policy "tenant_members_select" on public.tenant_members
--     for select using (auth.uid() = user_id);
--   create policy "tenant_members_manage" on public.tenant_members
--     for all to authenticated using (
--       exists(
--         select 1 from public.tenant_members m
--         where m.tenant_id = tenant_id and m.user_id = auth.uid() and m.role in ('owner','admin')
--       )
--     ) with check (
--       exists(
--         select 1 from public.tenant_members m
--         where m.tenant_id = tenant_id and m.user_id = auth.uid() and m.role in ('owner','admin')
--       )
--     );

-- 2) tenants: members can read their tenant; only service role can insert/update secrets
--   create policy "tenants_select" on public.tenants for select using (
--     exists(select 1 from public.tenant_members m where m.tenant_id = id and m.user_id = auth.uid())
--   );

-- 3) conversations/messages/knowledge/templates/stats_daily/worker_logs:
--   create policy "tenant_read" on <table> for select using (
--     exists(select 1 from public.tenant_members m where m.tenant_id = <table>.tenant_id and m.user_id = auth.uid())
--   );
--   create policy "tenant_write" on <table> for insert with check (
--     exists(select 1 from public.tenant_members m where m.tenant_id = <table>.tenant_id and m.user_id = auth.uid())
--   );
--   create policy "tenant_update" on <table> for update using (
--     exists(select 1 from public.tenant_members m where m.tenant_id = <table>.tenant_id and m.user_id = auth.uid())
--   ) with check (
--     exists(select 1 from public.tenant_members m where m.tenant_id = <table>.tenant_id and m.user_id = auth.uid())
--   );

-- Public ingest considerations (POST /api/public/messages):
--   Use server-side key to insert (bypass RLS via service role) or create a
--   restricted anonymous insert policy scoped by tenants.public_embed_token
--   verification inside a Postgres function. MVP: prefer service role on API route.

-- Internal n8n→Next webhook (POST /api/internal/reply):
--   Your server validates HMAC (tenants.hmac_shared_secret) and inserts messages
--   using service role. No client-side access to secrets via RLS.

-- =========================
-- Derived helpers (optional views)
-- =========================
-- Inbox summary view (fast list rendering)
create or replace view public.v_conversation_inbox as
select
  c.id,
  c.tenant_id,
  c.subject,
  c.channel,
  c.is_test,
  c.category,
  c.priority_score,
  c.status,
  c.created_at,
  c.updated_at,
  c.last_user_message_at,
  c.last_assistant_message_at,
  (c.last_user_message_at > coalesce(c.last_opened_at, timestamp 'epoch')) as is_unread
from public.conversations c;

-- =========================
-- Helper functions
-- =========================
-- Maintain conversation timestamps on message insert
create or replace function public.on_message_insert_update_conversation()
returns trigger as $$
begin
  if (new.role = 'user') then
    update public.conversations
      set last_user_message_at = coalesce(new.created_at, now()),
          first_user_message_at = coalesce(first_user_message_at, coalesce(new.created_at, now())),
          updated_at = now()
      where id = new.conversation_id;
  elsif (new.role = 'assistant') then
    update public.conversations
      set last_assistant_message_at = coalesce(new.created_at, now()),
          updated_at = now()
      where id = new.conversation_id;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_messages_after_insert on public.messages;
create trigger trg_messages_after_insert
after insert on public.messages
for each row execute function public.on_message_insert_update_conversation();

-- Subject fallback: set from first user message snippet if absent
create or replace function public.ensure_conversation_subject()
returns trigger as $$
declare
  first_snippet text;
begin
  if (new.subject is null or length(trim(new.subject)) = 0) then
    select left(m.content, 60) into first_snippet
    from public.messages m
    where m.conversation_id = new.id and m.role = 'user'
    order by m.created_at asc
    limit 1;
    if first_snippet is not null then
      new.subject = first_snippet;
    end if;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_conversations_before_update_subject on public.conversations;
create trigger trg_conversations_before_update_subject
before update on public.conversations
for each row execute function public.ensure_conversation_subject();

-- =========================
-- End of schema
-- =========================
