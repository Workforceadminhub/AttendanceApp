-- Bulk-email schema for the Harvesters Workers app.
-- Run once in the Supabase SQL editor (or via the Supabase CLI).
--
-- Two tables:
--   bulk_emails  — one row per bulk send (the "running table" of campaigns).
--   email_events — every delivery event from the Brevo/Resend webhook,
--                  linked back to a send via campaign_id.
--
-- Both are written by serverless functions using the SERVICE ROLE key, which
-- bypasses RLS. RLS is enabled with no public policies so the anon/public key
-- cannot read or write.

-- ── Sends ────────────────────────────────────────────────────────────
create table if not exists public.bulk_emails (
  id                text        primary key,            -- campaign id (ULID), also sent as the provider tag
  subject           text        not null,
  provider          text        not null,               -- 'brevo' | 'resend'
  sender            text,                                -- From header used
  sent_by           text,                                -- caller's login code / id, if known
  recipients_count  int         not null default 0,
  sent_count        int         not null default 0,
  failed_count      int         not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists bulk_emails_created_at_idx on public.bulk_emails (created_at desc);

-- ── Events ───────────────────────────────────────────────────────────
create table if not exists public.email_events (
  id           bigint generated always as identity primary key,
  campaign_id  text,                                     -- links to bulk_emails.id (from the provider tag)
  provider     text        not null,                     -- 'brevo' | 'resend'
  event        text        not null,                     -- delivered, opened, click, hard_bounce, spam, unsubscribed, ...
  email        text,                                      -- recipient address
  message_id   text,                                      -- provider message id
  subject      text,
  occurred_at  timestamptz,                               -- when the event happened (from the provider)
  received_at  timestamptz not null default now(),        -- when we ingested it
  raw          jsonb       not null                       -- full original payload
);

create index if not exists email_events_campaign_idx    on public.email_events (campaign_id);
create index if not exists email_events_email_idx        on public.email_events (email);
create index if not exists email_events_event_idx        on public.email_events (event);
create index if not exists email_events_message_id_idx   on public.email_events (message_id);
create index if not exists email_events_occurred_at_idx  on public.email_events (occurred_at desc);

-- Lock both tables to server-side (service role) access only.
alter table public.bulk_emails enable row level security;
alter table public.email_events enable row level security;
