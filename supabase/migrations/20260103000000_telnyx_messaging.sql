-- Phase 2: Telnyx messaging. Replaces the Twilio org columns and adds contacts, conversations and messages.
-- Browser sessions are read-only; all writes (webhook, send action) go through server code using the service role.

alter table public.orgs rename column twilio_phone_number to telnyx_phone_number;
alter table public.orgs rename column twilio_messaging_service_sid to telnyx_messaging_profile_id;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  name text,
  created_at timestamptz not null default now(),
  unique (org_id, phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, contact_id)
);

create index conversations_org_last_message_idx on public.conversations (org_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null default '',
  media_urls text[] not null default '{}',
  status text not null default 'received'
    check (status in ('received', 'queued', 'sent', 'delivered', 'failed')),
  error text,
  -- Telnyx message id; unique so retried webhooks never create duplicates.
  telnyx_message_id text unique,
  sent_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "members read contacts" on public.contacts
  for select to authenticated using (public.is_org_member(org_id));
create policy "members read conversations" on public.conversations
  for select to authenticated using (public.is_org_member(org_id));
create policy "members read messages" on public.messages
  for select to authenticated using (public.is_org_member(org_id));

-- Atomically records an inbound message: upserts contact + conversation, inserts the message.
-- Returns null when the Telnyx message id was already processed (webhook retry).
create or replace function public.record_inbound_message(
  p_org uuid,
  p_phone text,
  p_body text,
  p_media text[],
  p_telnyx_id text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact uuid;
  v_conversation uuid;
  v_message uuid;
  v_preview text := coalesce(nullif(left(p_body, 120), ''), '[media]');
begin
  insert into public.contacts (org_id, phone) values (p_org, p_phone)
    on conflict (org_id, phone) do update set phone = excluded.phone
    returning id into v_contact;

  insert into public.conversations (org_id, contact_id) values (p_org, v_contact)
    on conflict (org_id, contact_id) do update set org_id = excluded.org_id
    returning id into v_conversation;

  insert into public.messages (org_id, conversation_id, direction, body, media_urls, status, telnyx_message_id)
    values (p_org, v_conversation, 'inbound', p_body, coalesce(p_media, '{}'), 'received', p_telnyx_id)
    on conflict (telnyx_message_id) do nothing
    returning id into v_message;

  if v_message is not null then
    update public.conversations
      set last_message_at = now(), last_message_preview = v_preview, unread_count = unread_count + 1
      where id = v_conversation;
  end if;
  return v_message;
end;
$$;

revoke all on function public.record_inbound_message(uuid, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.record_inbound_message(uuid, text, text, text[], text) to service_role;
