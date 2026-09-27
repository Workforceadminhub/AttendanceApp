-- Per-campaign event counts for GET /api/email-report.
--
-- The report used to download raw email_events rows and count them in JS.
-- PostgREST caps every response at its max-rows setting (1000 by default),
-- so once a set of campaigns had more than 1000 events the stats were
-- silently undercounted, and the transfer grew with every event. This
-- function aggregates in the database and returns one row per campaign
-- (the report asks for at most 500 campaigns, under the row cap).
--
-- Apply: psql "$DATABASE_URL" -f db/email_report_counts.sql
-- Safe to re-run.

-- Serves `campaign_id = any(...)` plus the per-event grouping from the index.
create index if not exists email_events_campaign_event_idx
  on public.email_events (campaign_id, event);

create or replace function public.email_event_counts(campaign_ids text[])
returns table (campaign_id text, counts jsonb)
language sql
stable
set search_path = ''
as $$
  select per_event.campaign_id, jsonb_object_agg(per_event.event, per_event.n)
  from (
    select e.campaign_id, e.event, count(*) as n
    from public.email_events e
    where e.campaign_id = any (campaign_ids)
    group by e.campaign_id, e.event
  ) per_event
  group by per_event.campaign_id;
$$;

-- Server-side only: called by the report function with the service role key.
revoke all on function public.email_event_counts(text[]) from public, anon, authenticated;
grant execute on function public.email_event_counts(text[]) to service_role;

-- Table privileges for the service role. db/email_events.sql created these
-- tables without them; tables created by these migrations don't inherit
-- default privileges, so PostgREST calls fail with 42501 without them.
grant select, insert, update, delete on table public.bulk_emails to service_role;
grant select, insert, update, delete on table public.email_events to service_role;
