-- RLS policies for tenant-scoped reads used by /api/auth/user and /api/user/me
-- Idempotent: drops existing policies before (re)creating.

-- Ensure RLS is enabled (no-op if already enabled)
alter table if exists public.tenants enable row level security;
alter table if exists public.tenant_members enable row level security;

-- tenants_select: members can read their own tenant row
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select
  using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = tenants.id and m.user_id = auth.uid()
    )
  );

comment on policy tenants_select on public.tenants is
  'Allow select on tenants only to users who are members via tenant_members (auth.uid() scoped).';

-- tenant_members_select: users can read their own memberships
drop policy if exists tenant_members_select on public.tenant_members;
create policy tenant_members_select on public.tenant_members
  for select
  using (auth.uid() = user_id);

comment on policy tenant_members_select on public.tenant_members is
  'Allow select on tenant_members only for rows where user_id = auth.uid().' ;

