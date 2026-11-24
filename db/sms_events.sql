-- Bulk SMS schema for the Harvesters Workers app.
-- Apply with: psql "$DATABASE_URL" -f db/sms_events.sql
--
-- Two tables:
--   bulk_sms   - one row per bulk SMS send (written by api/send-bulk-sms.js).
--   sms_events - delivery events from the Sendchamp webhook (api/sms-webhook.js).
--
-- Both hold message bodies and phone numbers. They are written only by
-- serverless functions using the SERVICE ROLE key; RLS is enabled with no
-- policies and every other role is revoked.

create table if not exists public.bulk_sms (
  id               text        primary key,            -- campaign id (ULID)
  provider         text        not null,               -- 'sendchamp' | 'smartsmssolutions'
  sender_name      text,
  sent_by          text,                                -- non-secret actor id from the verified token
  route            text,
  message          text        not null,
  recipient_count  int         not null default 0,
  sent_count       int         not null default 0,
  failed_count     int         not null default 0,
  details          jsonb,
  created_at       timestamptz not null default now()
);

-- The table may already exist from before this file; the hourly quota in
-- api/send-bulk-sms.js filters on sent_by.
alter table public.bulk_sms add column if not exists sent_by text;

create index if not exists bulk_sms_sent_by_created_at_idx
  on public.bulk_sms (sent_by, created_at desc);

alter table public.bulk_sms enable row level security;
revoke all on table public.bulk_sms from public, anon, authenticated;
grant select, insert, update, delete on table public.bulk_sms to service_role;

create table if not exists public.sms_events (
  id            bigint generated always as identity primary key,
  service       text,
  status        text        not null,
  phone_number  text,
  message       text,
  sms_uid       text,
  reference     text,
  occurred_at   timestamptz,
  received_at   timestamptz not null default now(),
  raw           jsonb       not null
);

-- Drop repeats left by webhook retries, then make retries idempotent.
delete from public.sms_events a
  using public.sms_events b
  where a.id > b.id
    and a.sms_uid = b.sms_uid
    and a.status = b.status;

create unique index if not exists sms_events_uid_status_key
  on public.sms_events (sms_uid, status);
create index if not exists sms_events_reference_idx on public.sms_events (reference);

alter table public.sms_events enable row level security;
revoke all on table public.sms_events from public, anon, authenticated;
grant select, insert, update, delete on table public.sms_events to service_role;
