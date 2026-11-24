-- Hardening for the bulk-email tables plus the usage log behind upload quotas.
-- Apply with: psql "$DATABASE_URL" -f db/messaging_hardening.sql
-- Run after db/email_events.sql.

-- Service role only: RLS already has no policies, this removes the table
-- privileges as well.
revoke all on table public.bulk_emails from public, anon, authenticated;
revoke all on table public.email_events from public, anon, authenticated;

-- The hourly send quota in api/send-bulk-email.js filters on these.
create index if not exists bulk_emails_sent_by_created_at_idx
  on public.bulk_emails (sent_by, created_at desc);

-- Drop repeats left by webhook retries, then make retries idempotent.
-- occurred_at is part of the key so separate opens and clicks of one message
-- are still counted; a retry repeats the same timestamp.
delete from public.email_events a
  using public.email_events b
  where a.id > b.id
    and a.provider = b.provider
    and a.message_id = b.message_id
    and a.event = b.event
    and a.occurred_at = b.occurred_at;

create unique index if not exists email_events_dedupe_key
  on public.email_events (provider, message_id, event, occurred_at);

-- One row per rate-limited action that has no log table of its own
-- (api/upload-email-image.js).
create table if not exists public.api_usage (
  id          bigint generated always as identity primary key,
  action      text        not null,
  actor       text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists api_usage_action_actor_created_at_idx
  on public.api_usage (action, actor, created_at desc);

alter table public.api_usage enable row level security;
revoke all on table public.api_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.api_usage to service_role;
