-- Phase 1: organizations and team membership.
-- All writes go through server code using the service role; browser sessions are read-only.

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  twilio_phone_number text,
  twilio_messaging_service_sid text,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'agent')),
  display_name text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- One organization per user for now (the app resolves "current org" from this row).
create unique index org_members_user_id_key on public.org_members (user_id);

-- Helper functions are security definer so policies on org_members can reference org_members without recursion.
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.is_active
  );
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.is_active and m.role = 'admin'
  );
$$;

revoke all on function public.is_org_member(uuid), public.is_org_admin(uuid) from public;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid) to authenticated;

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;

create policy "members read their org" on public.orgs
  for select to authenticated using (public.is_org_member(id));

-- A user can always read their own membership row (needed to detect "Account not activated"),
-- and active members can read the rest of their team.
create policy "read own membership" on public.org_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members read team" on public.org_members
  for select to authenticated using (public.is_org_member(org_id));

-- No insert/update/delete policies: only the service role (server actions) writes.
