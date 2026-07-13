-- =============================================================================
-- Migration 0002: Functions & triggers
-- =============================================================================
-- SECURITY DEFINER helper functions run as the migration owner (postgres) which
-- has BYPASSRLS, so they can safely read profiles from inside RLS policies
-- without causing recursive policy evaluation. All of them pin search_path.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'organizations','profiles','categories','questions','exam_templates',
    'exams','exam_assignments','exam_sessions','answers','evaluations',
    'reports','invitations'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- RBAC helper functions (used throughout the RLS policies)
-- ----------------------------------------------------------------------------
create or replace function public.current_role_key()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false);
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'org_admin' from public.profiles where id = auth.uid()),
    false);
$$;

-- True if the current user may act within the given organization
-- (super admins may act within any organization).
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_super_admin()
      or coalesce(
           (select organization_id = org from public.profiles where id = auth.uid()),
           false);
$$;

-- True if the current user is an admin (org_admin) of the given organization,
-- or a super admin.
create or replace function public.is_org_admin_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_super_admin()
      or coalesce(
           (select role = 'org_admin' and organization_id = org
              from public.profiles where id = auth.uid()),
           false);
$$;

grant execute on function public.current_role_key() to authenticated, anon;
grant execute on function public.current_org_id() to authenticated, anon;
grant execute on function public.is_super_admin() to authenticated, anon;
grant execute on function public.is_org_admin() to authenticated, anon;
grant execute on function public.is_org_member(uuid) to authenticated, anon;
grant execute on function public.is_org_admin_of(uuid) to authenticated, anon;

-- ----------------------------------------------------------------------------
-- Short human-friendly code generator (exam join codes, invitation codes)
-- ----------------------------------------------------------------------------
create or replace function public.generate_code(len int default 8)
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- New auth user -> profile. Roles are derived from a pending invitation
-- (created by an admin) and never from user-supplied metadata, so a user can
-- never self-assign an elevated role at sign-up.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv           public.invitations%rowtype;
  derived_role  text := 'student';
  derived_org   uuid := null;
  meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Look for the most recent still-valid invitation for this email.
  select * into inv
  from public.invitations
  where email = new.email
    and status = 'pending'
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if found then
    derived_role := inv.role;
    derived_org  := inv.organization_id;

    update public.invitations
      set status = 'accepted',
          accepted_by = new.id,
          accepted_at = now()
      where id = inv.id;
  end if;

  insert into public.profiles (id, email, full_name, role, organization_id, status)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', meta->>'name'),
    derived_role,
    derived_org,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Lightweight audit helper callable from the app (SECURITY DEFINER so inserts
-- are always allowed regardless of the caller's RLS on audit_logs).
-- ----------------------------------------------------------------------------
create or replace function public.log_audit_event(
  p_action      text,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_description text default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id  uuid;
  v_org uuid;
begin
  v_org := public.current_org_id();
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, description, metadata)
  values (v_org, auth.uid(), p_action, p_entity_type, p_entity_id, p_description, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_audit_event(text, text, uuid, text, jsonb) to authenticated;
