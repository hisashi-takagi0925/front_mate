-- Create tenant_members table (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tenant_members'
  ) then
    create table public.tenant_members (
      tenant_id uuid not null references public.tenants(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      role member_role not null default 'member',
      created_at timestamptz not null default now(),
      primary key (tenant_id, user_id)
    );
  end if;
end $$;

create index if not exists tenant_members_user_idx on public.tenant_members(user_id);

-- Enable RLS (policies should be added separately)
alter table public.tenant_members enable row level security;

