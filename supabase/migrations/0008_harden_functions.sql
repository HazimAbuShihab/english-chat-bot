-- =============================================================================
-- Migration 0008: Function hardening (advisor follow-up)
-- =============================================================================
-- * Pin search_path on the two remaining mutable functions.
-- * Remove EXECUTE from trigger-only functions so they are not reachable via
--   the PostgREST RPC surface (triggers fire regardless of EXECUTE grants).
-- * Restrict helper/RPC functions to the authenticated role only (anon never
--   needs them; policies are all scoped `to authenticated`).
-- =============================================================================

-- Pin search_path -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_code(len int default 8)
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Trigger-only functions: not callable over the API ---------------------------
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_columns() from public, anon, authenticated;

-- Helper functions: authenticated only (required by RLS policy evaluation) -----
do $$
declare
  fn text;
  fns text[] := array[
    'public.current_role_key()',
    'public.current_org_id()',
    'public.is_super_admin()',
    'public.is_org_admin()',
    'public.is_org_member(uuid)',
    'public.is_org_admin_of(uuid)',
    'public.generate_code(int)',
    'public.log_audit_event(text, text, uuid, text, jsonb)',
    'public.start_exam_session(uuid)',
    'public.get_session_detail(uuid)',
    'public.submit_exam_session(uuid)',
    'public.org_dashboard_stats(uuid)',
    'public.platform_stats()'
  ];
begin
  foreach fn in array fns loop
    execute format('revoke all on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end$$;
