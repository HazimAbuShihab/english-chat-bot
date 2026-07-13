-- =============================================================================
-- Migration 0004: Exam-flow RPCs and dashboard statistics
-- =============================================================================
-- Students never read the question bank directly. Instead they call these
-- SECURITY DEFINER functions, which enforce ownership/assignment before
-- returning only the questions that belong to their own session.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- start_exam_session: create (or resume) a student's attempt at an exam.
-- Freezes a randomized question order into the session for reproducibility.
-- ----------------------------------------------------------------------------
create or replace function public.start_exam_session(p_exam_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_exam       public.exams%rowtype;
  v_assignment public.exam_assignments%rowtype;
  v_existing   uuid;
  v_attempts   int;
  v_randomize  boolean;
  v_qcount     int;
  v_ids        uuid[];
  v_order      jsonb;
  v_session_id uuid;
  v_expires    timestamptz;
  v_total_secs int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_exam from public.exams where id = p_exam_id and deleted_at is null;
  if not found then
    raise exception 'Exam not found';
  end if;

  if v_exam.status not in ('active','scheduled') then
    raise exception 'Exam is not available';
  end if;
  if v_exam.available_from is not null and now() < v_exam.available_from then
    raise exception 'Exam has not started yet';
  end if;
  if v_exam.available_until is not null and now() > v_exam.available_until then
    raise exception 'Exam window has closed';
  end if;

  select * into v_assignment
  from public.exam_assignments
  where exam_id = p_exam_id and student_id = v_uid;
  if not found then
    raise exception 'You are not assigned to this exam';
  end if;

  -- Resume an in-flight attempt if one exists.
  select id into v_existing
  from public.exam_sessions
  where exam_id = p_exam_id and student_id = v_uid
    and status in ('not_started','in_progress')
  order by attempt_number desc
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  select count(*) into v_attempts
  from public.exam_sessions
  where exam_id = p_exam_id and student_id = v_uid;

  if v_exam.max_attempts > 0 and v_attempts >= v_exam.max_attempts then
    raise exception 'No attempts remaining for this exam';
  end if;

  v_randomize := coalesce((v_exam.settings->>'randomize_questions')::boolean, false);
  v_qcount    := coalesce((v_exam.settings->>'question_count')::int, 0);

  if v_randomize then
    select array_agg(eq.question_id order by random()) into v_ids
    from public.exam_questions eq
    join public.questions q on q.id = eq.question_id
    where eq.template_id = v_exam.template_id and q.is_active and q.deleted_at is null;
  else
    select array_agg(eq.question_id order by eq.position, eq.created_at) into v_ids
    from public.exam_questions eq
    join public.questions q on q.id = eq.question_id
    where eq.template_id = v_exam.template_id and q.is_active and q.deleted_at is null;
  end if;

  if v_ids is null then
    raise exception 'This exam has no questions configured';
  end if;
  if v_qcount > 0 and array_length(v_ids, 1) > v_qcount then
    v_ids := v_ids[1:v_qcount];
  end if;
  v_order := to_jsonb(v_ids::text[]);

  -- Compute an expiry from the exam/template total time limit if set.
  v_total_secs := coalesce((v_exam.settings->>'total_time_limit_seconds')::int, 0);
  if v_total_secs > 0 then
    v_expires := now() + make_interval(secs => v_total_secs);
  end if;

  insert into public.exam_sessions (
    exam_id, assignment_id, student_id, organization_id,
    attempt_number, status, question_order, current_index, started_at, expires_at
  ) values (
    p_exam_id, v_assignment.id, v_uid, v_exam.organization_id,
    v_attempts + 1, 'in_progress', v_order, 0, now(), v_expires
  ) returning id into v_session_id;

  update public.exam_assignments
    set status = 'started', attempts_used = attempts_used + 1
    where id = v_assignment.id;

  return v_session_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- get_session_detail: full payload for the exam runner (session + exam +
-- ordered questions + any existing answers). Enforces ownership.
-- ----------------------------------------------------------------------------
create or replace function public.get_session_detail(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_session public.exam_sessions%rowtype;
  v_exam    public.exams%rowtype;
  v_questions jsonb;
begin
  select * into v_session from public.exam_sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found';
  end if;

  if not (v_session.student_id = v_uid or public.is_org_admin_of(v_session.organization_id)) then
    raise exception 'Not authorized';
  end if;

  select * into v_exam from public.exams where id = v_session.exam_id;

  select jsonb_agg(item order by pos) into v_questions
  from (
    select ord.pos,
      jsonb_build_object(
        'id', q.id,
        'position', ord.pos,
        'title', q.title,
        'description', q.description,
        'question_text', q.question_text,
        'audio_url', q.audio_url,
        'cefr_level', q.cefr_level,
        'difficulty', q.difficulty,
        'prep_time_seconds', q.prep_time_seconds,
        'time_limit_seconds', q.time_limit_seconds,
        'answer', case when a.id is not null then jsonb_build_object(
            'id', a.id, 'status', a.status, 'audio_file_id', a.audio_file_id,
            'skipped', a.skipped, 'duration_seconds', a.duration_seconds,
            'answered_at', a.answered_at) else null end
      ) as item
    from jsonb_array_elements_text(v_session.question_order) with ordinality as ord(qid, pos)
    join public.questions q on q.id = ord.qid::uuid
    left join public.answers a on a.session_id = v_session.id and a.question_id = q.id
  ) sub;

  return jsonb_build_object(
    'session', to_jsonb(v_session),
    'exam', jsonb_build_object(
      'id', v_exam.id, 'title', v_exam.title, 'description', v_exam.description,
      'passing_score', v_exam.passing_score, 'show_results_to_student', v_exam.show_results_to_student,
      'settings', v_exam.settings),
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- submit_exam_session: finalize an attempt and queue it for evaluation.
-- ----------------------------------------------------------------------------
create or replace function public.submit_exam_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_session public.exam_sessions%rowtype;
  v_eval_id uuid;
begin
  select * into v_session from public.exam_sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found';
  end if;
  if not (v_session.student_id = v_uid or public.is_org_admin_of(v_session.organization_id)) then
    raise exception 'Not authorized';
  end if;
  if v_session.status in ('submitted','evaluating','evaluated') then
    return p_session_id; -- idempotent
  end if;

  update public.exam_sessions
    set status = 'submitted',
        submitted_at = now(),
        total_time_seconds = coalesce(total_time_seconds, extract(epoch from (now() - started_at))::int)
    where id = p_session_id;

  update public.exam_assignments
    set status = 'submitted'
    where id = v_session.assignment_id;

  -- Create the pending evaluation record (filled in by the evaluation module).
  insert into public.evaluations (session_id, organization_id, student_id, status, evaluator)
  values (p_session_id, v_session.organization_id, v_session.student_id, 'pending', 'mock')
  on conflict (session_id) do nothing
  returning id into v_eval_id;

  return p_session_id;
end;
$$;

grant execute on function public.start_exam_session(uuid) to authenticated;
grant execute on function public.get_session_detail(uuid) to authenticated;
grant execute on function public.submit_exam_session(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- org_dashboard_stats: aggregate metrics for an organization admin.
-- ----------------------------------------------------------------------------
create or replace function public.org_dashboard_stats(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_org_admin_of(p_org) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'students', (select count(*) from public.profiles where organization_id = p_org and role = 'student' and deleted_at is null),
    'exams', (select count(*) from public.exams where organization_id = p_org and deleted_at is null),
    'sessions_total', (select count(*) from public.exam_sessions where organization_id = p_org),
    'sessions_completed', (select count(*) from public.exam_sessions where organization_id = p_org and status in ('submitted','evaluating','evaluated')),
    'average_score', (select round(avg(overall_score), 1) from public.evaluations where organization_id = p_org and status = 'completed'),
    'pass_rate', (
      select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where e.overall_score >= ex.passing_score) / count(*), 1) end
      from public.evaluations e join public.exams ex on ex.id = (select exam_id from public.exam_sessions s where s.id = e.session_id)
      where e.organization_id = p_org and e.status = 'completed'),
    'cefr_distribution', (
      select coalesce(jsonb_object_agg(cefr_level, cnt), '{}'::jsonb)
      from (select cefr_level, count(*) cnt from public.evaluations
            where organization_id = p_org and status = 'completed' and cefr_level is not null
            group by cefr_level) d)
  ) into v_result;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- platform_stats: aggregate metrics for the super admin.
-- ----------------------------------------------------------------------------
create or replace function public.platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'organizations', (select count(*) from public.organizations where deleted_at is null),
    'users', (select count(*) from public.profiles where deleted_at is null),
    'students', (select count(*) from public.profiles where role = 'student' and deleted_at is null),
    'exams', (select count(*) from public.exams where deleted_at is null),
    'sessions', (select count(*) from public.exam_sessions),
    'evaluations', (select count(*) from public.evaluations where status = 'completed'),
    'audio_files', (select count(*) from public.audio_files),
    'storage_bytes', (select coalesce(sum(size_bytes), 0) from public.audio_files)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.org_dashboard_stats(uuid) to authenticated;
grant execute on function public.platform_stats() to authenticated;
