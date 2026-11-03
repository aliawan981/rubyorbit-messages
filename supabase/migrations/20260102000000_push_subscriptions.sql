-- Web Push: one row per browser/device a team member has enabled notifications on.
-- Browser sessions can only read their own rows; all writes go through server code using the service role.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
