-- =============================================================================
-- Migration 0003: Row Level Security + grants
-- =============================================================================
-- Access model:
--   super_admin  -> full access to every organization
--   org_admin    -> full access scoped to their own organization
--   student      -> read/write only their own sessions/answers/results and
--                   read the exams assigned to them
-- service_role (used by Edge Functions) bypasses RLS entirely.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Baseline privileges (RLS still governs row visibility on top of these)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.roles to anon;

-- ----------------------------------------------------------------------------
-- Guard: non-admins may not change privileged profile columns on themselves.
-- auth.uid() IS NULL => trusted server context (service role / SQL / seed).
-- ----------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not (public.is_super_admin() or public.is_org_admin_of(old.organization_id)) then
    new.role := old.role;
    new.organization_id := old.organization_id;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ----------------------------------------------------------------------------
-- Enable RLS on every table
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'roles','organizations','profiles','categories','questions','exam_templates',
    'exam_questions','exams','exam_assignments','exam_sessions','audio_files',
    'answers','evaluations','answer_evaluations','reports','invitations','audit_logs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- roles (read-only lookup)
-- ----------------------------------------------------------------------------
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_super_admin() or id = public.current_org_id());

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(id))
  with check (public.is_super_admin() or public.is_org_admin_of(id));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations for delete to authenticated
  using (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (public.is_org_admin() and organization_id = public.current_org_id())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_super_admin() or public.is_org_admin_of(organization_id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin() or (public.is_org_admin() and organization_id = public.current_org_id()))
  with check (id = auth.uid() or public.is_super_admin() or (public.is_org_admin() and organization_id = public.current_org_id()));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated
  using (organization_id is null or public.is_org_member(organization_id));

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- questions (bank is not directly readable by students; served via RPC)
-- ----------------------------------------------------------------------------
drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions for select to authenticated
  using (
    public.is_super_admin()
    or ((organization_id is null or organization_id = public.current_org_id()) and public.is_org_admin())
  );

drop policy if exists questions_write on public.questions;
create policy questions_write on public.questions for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- exam_templates
-- ----------------------------------------------------------------------------
drop policy if exists exam_templates_select on public.exam_templates;
create policy exam_templates_select on public.exam_templates for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id));

drop policy if exists exam_templates_write on public.exam_templates;
create policy exam_templates_write on public.exam_templates for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- exam_questions (template membership)
-- ----------------------------------------------------------------------------
drop policy if exists exam_questions_all on public.exam_questions;
create policy exam_questions_all on public.exam_questions for all to authenticated
  using (exists (
    select 1 from public.exam_templates t
    where t.id = template_id and (public.is_super_admin() or public.is_org_admin_of(t.organization_id))))
  with check (exists (
    select 1 from public.exam_templates t
    where t.id = template_id and (public.is_super_admin() or public.is_org_admin_of(t.organization_id))));

-- ----------------------------------------------------------------------------
-- exams
-- ----------------------------------------------------------------------------
drop policy if exists exams_select on public.exams;
create policy exams_select on public.exams for select to authenticated
  using (
    public.is_super_admin()
    or public.is_org_admin_of(organization_id)
    or exists (select 1 from public.exam_assignments a where a.exam_id = exams.id and a.student_id = auth.uid())
  );

drop policy if exists exams_write on public.exams;
create policy exams_write on public.exams for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- exam_assignments
-- ----------------------------------------------------------------------------
drop policy if exists exam_assignments_select on public.exam_assignments;
create policy exam_assignments_select on public.exam_assignments for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id) or student_id = auth.uid());

drop policy if exists exam_assignments_write on public.exam_assignments;
create policy exam_assignments_write on public.exam_assignments for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- exam_sessions (students own their attempts)
-- ----------------------------------------------------------------------------
drop policy if exists exam_sessions_select on public.exam_sessions;
create policy exam_sessions_select on public.exam_sessions for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id) or student_id = auth.uid());

drop policy if exists exam_sessions_insert on public.exam_sessions;
create policy exam_sessions_insert on public.exam_sessions for insert to authenticated
  with check (
    (student_id = auth.uid() and public.is_org_member(organization_id))
    or public.is_org_admin_of(organization_id)
  );

drop policy if exists exam_sessions_update on public.exam_sessions;
create policy exam_sessions_update on public.exam_sessions for update to authenticated
  using (student_id = auth.uid() or public.is_org_admin_of(organization_id))
  with check (student_id = auth.uid() or public.is_org_admin_of(organization_id));

drop policy if exists exam_sessions_delete on public.exam_sessions;
create policy exam_sessions_delete on public.exam_sessions for delete to authenticated
  using (public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- audio_files
-- ----------------------------------------------------------------------------
drop policy if exists audio_files_select on public.audio_files;
create policy audio_files_select on public.audio_files for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id) or student_id = auth.uid());

drop policy if exists audio_files_insert on public.audio_files;
create policy audio_files_insert on public.audio_files for insert to authenticated
  with check (
    (student_id = auth.uid() and public.is_org_member(organization_id))
    or public.is_org_admin_of(organization_id)
  );

drop policy if exists audio_files_modify on public.audio_files;
create policy audio_files_modify on public.audio_files for update to authenticated
  using (student_id = auth.uid() or public.is_org_admin_of(organization_id))
  with check (student_id = auth.uid() or public.is_org_admin_of(organization_id));

drop policy if exists audio_files_delete on public.audio_files;
create policy audio_files_delete on public.audio_files for delete to authenticated
  using (student_id = auth.uid() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- answers
-- ----------------------------------------------------------------------------
drop policy if exists answers_select on public.answers;
create policy answers_select on public.answers for select to authenticated
  using (
    public.is_super_admin()
    or public.is_org_admin_of(organization_id)
    or exists (select 1 from public.exam_sessions s where s.id = answers.session_id and s.student_id = auth.uid())
  );

drop policy if exists answers_write on public.answers;
create policy answers_write on public.answers for all to authenticated
  using (
    public.is_org_admin_of(organization_id)
    or exists (select 1 from public.exam_sessions s where s.id = answers.session_id and s.student_id = auth.uid())
  )
  with check (
    public.is_org_admin_of(organization_id)
    or exists (select 1 from public.exam_sessions s where s.id = answers.session_id and s.student_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- evaluations (written by admins / service role; students read their own)
-- ----------------------------------------------------------------------------
drop policy if exists evaluations_select on public.evaluations;
create policy evaluations_select on public.evaluations for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id) or student_id = auth.uid());

drop policy if exists evaluations_write on public.evaluations;
create policy evaluations_write on public.evaluations for all to authenticated
  using (public.is_org_admin_of(organization_id))
  with check (public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- answer_evaluations
-- ----------------------------------------------------------------------------
drop policy if exists answer_evaluations_select on public.answer_evaluations;
create policy answer_evaluations_select on public.answer_evaluations for select to authenticated
  using (exists (
    select 1 from public.evaluations e
    where e.id = evaluation_id
      and (public.is_super_admin() or public.is_org_admin_of(e.organization_id) or e.student_id = auth.uid())));

drop policy if exists answer_evaluations_write on public.answer_evaluations;
create policy answer_evaluations_write on public.answer_evaluations for all to authenticated
  using (exists (
    select 1 from public.evaluations e
    where e.id = evaluation_id and public.is_org_admin_of(e.organization_id)))
  with check (exists (
    select 1 from public.evaluations e
    where e.id = evaluation_id and public.is_org_admin_of(e.organization_id)));

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id) or student_id = auth.uid());

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for all to authenticated
  using (public.is_org_admin_of(organization_id))
  with check (public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- invitations (admin managed)
-- ----------------------------------------------------------------------------
drop policy if exists invitations_all on public.invitations;
create policy invitations_all on public.invitations for all to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id))
  with check (public.is_super_admin() or public.is_org_admin_of(organization_id));

-- ----------------------------------------------------------------------------
-- audit_logs (read only for admins; writes go through log_audit_event)
-- ----------------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.is_super_admin() or public.is_org_admin_of(organization_id));
