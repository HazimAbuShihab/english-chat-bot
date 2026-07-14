-- =============================================================================
-- Migration 0010: Multiple-choice question support
-- =============================================================================
-- Exams may now mix speaking questions (audio answers) with multiple-choice
-- questions (objectively graded). Correct answers live on `questions` and are
-- NEVER returned to students — get_session_detail deliberately omits them.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum ('speaking', 'multiple_choice');
  end if;
end$$;

-- Question bank: type + options + correct answer(s)
alter table public.questions
  add column if not exists question_type public.question_type not null default 'speaking',
  add column if not exists options jsonb,               -- [{ "key": "a", "text": "..." }, ...]
  add column if not exists correct_option_keys text[];  -- e.g. ['a'] (supports multi-correct)
create index if not exists questions_question_type_idx on public.questions(question_type);

-- Answers: the student's selection + whether it was correct
alter table public.answers
  add column if not exists selected_options text[],
  add column if not exists is_correct boolean;

-- Evaluations: objective MCQ component alongside the speaking scores
alter table public.evaluations
  add column if not exists mcq_score numeric(5,2),
  add column if not exists mcq_correct int,
  add column if not exists mcq_total int;

-- Recreate get_session_detail to expose question_type + options (but never the
-- correct answer keys) and the student's prior selection for resume.
create or replace function public.get_session_detail(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid     uuid := auth.uid();
  v_session public.exam_sessions%rowtype;
  v_exam    public.exams%rowtype;
  v_questions jsonb;
begin
  select * into v_session from public.exam_sessions where id = p_session_id;
  if not found then raise exception 'Session not found'; end if;
  if not (v_session.student_id = v_uid or public.is_org_admin_of(v_session.organization_id)) then
    raise exception 'Not authorized';
  end if;

  select * into v_exam from public.exams where id = v_session.exam_id;

  select jsonb_agg(item order by pos) into v_questions
  from (
    select ord.pos,
      jsonb_build_object(
        'id', q.id, 'position', ord.pos, 'title', q.title, 'description', q.description,
        'question_text', q.question_text, 'audio_url', q.audio_url,
        'question_type', q.question_type, 'options', coalesce(q.options, '[]'::jsonb),
        'cefr_level', q.cefr_level, 'difficulty', q.difficulty,
        'prep_time_seconds', q.prep_time_seconds, 'time_limit_seconds', q.time_limit_seconds,
        'answer', case when a.id is not null then jsonb_build_object(
            'id', a.id, 'status', a.status, 'audio_file_id', a.audio_file_id,
            'skipped', a.skipped, 'duration_seconds', a.duration_seconds, 'answered_at', a.answered_at,
            'selected_options', coalesce(a.selected_options, array[]::text[])) else null end
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
