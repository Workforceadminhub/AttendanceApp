-- Email events captured from the Brevo/Resend webhook (api/email-webhook.js).
-- Run this once in the Supabase SQL editor (or via the Supabase CLI).
--
-- The webhook writes with the SERVICE ROLE key, which bypasses RLS. RLS is
-- enabled with no public policies so the anon/public key cannot read events.

create table if not exists public.email_events (
  id           bigint generated always as identity primary key,
  provider     text        not null,                 -- 'brevo' | 'resend'
  event        text        not null,                 -- delivered, opened, click, hard_bounce, spam, unsubscribed, ...
  email        text,                                  -- recipient address
  message_id   text,                                  -- provider message id (groups events for one send)
  subject      text,
  occurred_at  timestamptz,                           -- when the event happened (from the provider)
  received_at  timestamptz not null default now(),    -- when we ingested it
  raw          jsonb       not null                   -- full original payload, for anything not columnised
);

create index if not exists email_events_email_idx       on public.email_events (email);
create index if not exists email_events_event_idx       on public.email_events (event);
create index if not exists email_events_message_id_idx  on public.email_events (message_id);
create index if not exists email_events_occurred_at_idx on public.email_events (occurred_at desc);

-- Lock the table down to server-side (service role) access only.
alter table public.email_events enable row level security;
