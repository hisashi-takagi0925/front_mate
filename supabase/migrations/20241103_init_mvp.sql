-- FrontMate MVP initial migration (Supabase/PostgreSQL)
-- This mirrors docs/db-schema.sql

create extension if not exists pgcrypto;

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

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier plan_tier not null default 'free',
  public_embed_token text unique not null,
  hmac_shared_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_created_at_idx on public.tenants(created_at desc);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members(user_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject text,
  channel channel not null default 'web',
  source text,
  is_test boolean not null default false,
  category inquiry_category,
  priority_score int,
  status conversation_status not null default 'open',
  first_user_message_at timestamptz,
  last_user_message_at timestamptz,
  last_assistant_message_at timestamptz,
  last_opened_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_tenant_created_idx on public.conversations(tenant_id, created_at desc);
create index if not exists conversations_tenant_status_idx on public.conversations(tenant_id, status, created_at desc);
create index if not exists conversations_tenant_category_idx on public.conversations(tenant_id, category);
create index if not exists conversations_priority_idx on public.conversations(tenant_id, priority_score desc nulls last);
create index if not exists conversations_is_test_idx on public.conversations(tenant_id, is_test);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role message_role not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at asc);

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

create table if not exists public.stats_daily (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  d date not null,
  count_total int not null default 0,
  count_by_category jsonb not null default '{}'::jsonb,
  avg_first_reply_seconds numeric(10,2),
  primary key (tenant_id, d)
);

create index if not exists stats_daily_tenant_d_idx on public.stats_daily(tenant_id, d desc);

create table if not exists public.worker_logs (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  source text not null,
  level text not null check (level in ('debug','info','warn','error')),
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists worker_logs_tenant_created_idx on public.worker_logs(tenant_id, created_at desc);

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

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.templates enable row level security;
alter table public.stats_daily enable row level security;
alter table public.worker_logs enable row level security;

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

-- RLS policies should be added in a separate migration or via dashboard.

