-- =============================================================================
-- Migration 0009: One candidate report per session (enables idempotent upsert)
-- =============================================================================
create unique index if not exists reports_session_type_uidx
  on public.reports(session_id, report_type)
  where session_id is not null;
