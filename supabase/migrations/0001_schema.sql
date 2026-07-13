-- =============================================================================
-- English Speaking Assessment Platform
-- Migration 0001: Extensions, enums, and normalized schema
-- =============================================================================
-- All primary keys are UUIDs. Every business table carries created_at/updated_at
-- and, where a soft delete is meaningful, a deleted_at column. Tenancy is modeled
-- through organization_id. Row Level Security is enabled in migration 0003.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;   -- gen_random_uuid()
create extension if not exists "citext" with schema extensions;     -- case-insensitive text

-- ----------------------------------------------------------------------------
-- Enumerated types
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cefr_level') then
    create type public.cefr_level as enum ('A1','A2','B1','B2','C1','C2');
  end if;
  if not exists (select 1 from pg_type where typname = 'difficulty_level') then
    create type public.difficulty_level as enum ('easy','medium','hard');
  end if;
  if not exists (select 1 from pg_type where typname = 'template_status') then
    create type public.template_status as enum ('draft','published','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'exam_status') then
    create type public.exam_status as enum ('draft','scheduled','active','closed','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type public.assignment_status as enum ('assigned','started','submitted','evaluated','expired','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type public.session_status as enum ('not_started','in_progress','submitted','abandoned','evaluating','evaluated','expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'answer_status') then
    create type public.answer_status as enum ('pending','recorded','uploaded','skipped');
  end if;
  if not exists (select 1 from pg_type where typname = 'evaluation_status') then
    create type public.evaluation_status as enum ('pending','processing','completed','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'evaluator_type') then
    create type public.evaluator_type as enum ('mock','manual','ai');
  end if;
  if not exists (select 1 from pg_type where typname = 'retake_policy') then
    create type public.retake_policy as enum ('none','limited','unlimited');
  end if;
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('pending','accepted','expired','revoked');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('pending','ready','failed');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Roles (lookup / RBAC)
-- ----------------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,          -- super_admin | org_admin | student
  name        text not null,
  description text,
  rank        int  not null default 0,       -- higher = more privilege
  created_at  timestamptz not null default now()
);
comment on table public.roles is 'Application roles used for RBAC.';

-- ----------------------------------------------------------------------------
-- Organizations (tenants)
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           citext not null unique,
  logo_url       text,
  contact_email  text,
  contact_phone  text,
  website        text,
  plan           text not null default 'free',
  max_students   int,
  settings       jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
comment on table public.organizations is 'Tenant organizations that own students, questions and exams.';

-- ----------------------------------------------------------------------------
-- Profiles (application users, 1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references public.organizations(id) on delete set null,
  role             text not null default 'student' references public.roles(key),
  email            citext,
  full_name        text,
  avatar_url       text,
  phone            text,
  locale           text not null default 'en',
  native_language  text,
  status           text not null default 'active',   -- active | suspended | invited
  last_seen_at     timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists profiles_role_idx on public.profiles(role);
comment on table public.profiles is 'Application user profiles linked to Supabase auth.users.';

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade, -- null = global
  name             text not null,
  slug             citext not null,
  description      text,
  color            text,
  icon             text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create unique index if not exists categories_org_slug_uidx
  on public.categories(organization_id, slug) where organization_id is not null;
create unique index if not exists categories_global_slug_uidx
  on public.categories(slug) where organization_id is null;
create index if not exists categories_organization_id_idx on public.categories(organization_id);
comment on table public.categories is 'Question categories. Null organization_id = global/system category.';

-- ----------------------------------------------------------------------------
-- Questions (the ONLY source of interview questions)
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade, -- null = global
  category_id       uuid references public.categories(id) on delete set null,
  title             text not null,
  description       text,
  question_text     text not null,
  audio_url         text,                          -- storage path in question-audio bucket
  cefr_level        public.cefr_level not null default 'B1',
  difficulty        public.difficulty_level not null default 'medium',
  tags              text[] not null default '{}',
  prep_time_seconds int not null default 30,
  time_limit_seconds int not null default 120,
  max_score         numeric(5,2) not null default 100,
  is_active         boolean not null default true,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists questions_organization_id_idx on public.questions(organization_id);
create index if not exists questions_category_id_idx on public.questions(category_id);
create index if not exists questions_cefr_level_idx on public.questions(cefr_level);
create index if not exists questions_difficulty_idx on public.questions(difficulty);
create index if not exists questions_is_active_idx on public.questions(is_active);
create index if not exists questions_tags_gin_idx on public.questions using gin(tags);
comment on table public.questions is 'Question bank. Interview questions are served ONLY from this table.';

-- ----------------------------------------------------------------------------
-- Exam templates (reusable blueprints)
-- ----------------------------------------------------------------------------
create table if not exists public.exam_templates (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  title                  text not null,
  description            text,
  instructions           text,
  randomize_questions    boolean not null default false,
  randomize_categories   boolean not null default false,
  question_count         int,                       -- if set, pick a subset of this size
  passing_score          numeric(5,2) not null default 60,
  total_time_limit_seconds int,                     -- null = sum of question limits
  retake_policy          public.retake_policy not null default 'none',
  max_attempts           int not null default 1,
  show_results_to_student boolean not null default true,
  status                 public.template_status not null default 'draft',
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);
create index if not exists exam_templates_organization_id_idx on public.exam_templates(organization_id);
create index if not exists exam_templates_status_idx on public.exam_templates(status);
comment on table public.exam_templates is 'Reusable exam blueprints (question selection + rules).';

-- ----------------------------------------------------------------------------
-- Exam questions (template <-> question join, with ordering & overrides)
-- ----------------------------------------------------------------------------
create table if not exists public.exam_questions (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references public.exam_templates(id) on delete cascade,
  question_id        uuid not null references public.questions(id) on delete restrict,
  position           int not null default 0,
  is_required        boolean not null default true,
  points             numeric(5,2),                  -- override question.max_score
  time_limit_seconds int,                            -- override question.time_limit_seconds
  created_at         timestamptz not null default now(),
  unique(template_id, question_id)
);
create index if not exists exam_questions_template_id_idx on public.exam_questions(template_id);
create index if not exists exam_questions_question_id_idx on public.exam_questions(question_id);
comment on table public.exam_questions is 'Ordered questions belonging to an exam template.';

-- ----------------------------------------------------------------------------
-- Exams (a published instance derived from a template)
-- ----------------------------------------------------------------------------
create table if not exists public.exams (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  template_id      uuid references public.exam_templates(id) on delete set null,
  title            text not null,
  description      text,
  join_code        text unique,                    -- short code for exam-code login
  status           public.exam_status not null default 'draft',
  available_from   timestamptz,
  available_until  timestamptz,
  settings         jsonb not null default '{}'::jsonb,  -- snapshot of template rules
  passing_score    numeric(5,2) not null default 60,
  max_attempts     int not null default 1,
  show_results_to_student boolean not null default true,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists exams_organization_id_idx on public.exams(organization_id);
create index if not exists exams_status_idx on public.exams(status);
create index if not exists exams_join_code_idx on public.exams(join_code);
comment on table public.exams is 'A published exam derived from a template and assigned to students.';

-- ----------------------------------------------------------------------------
-- Exam assignments (which student is assigned to which exam)
-- ----------------------------------------------------------------------------
create table if not exists public.exam_assignments (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete cascade,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  status           public.assignment_status not null default 'assigned',
  attempts_used    int not null default 0,
  assigned_by      uuid references public.profiles(id) on delete set null,
  due_at           timestamptz,
  invited_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(exam_id, student_id)
);
create index if not exists exam_assignments_student_id_idx on public.exam_assignments(student_id);
create index if not exists exam_assignments_exam_id_idx on public.exam_assignments(exam_id);
create index if not exists exam_assignments_organization_id_idx on public.exam_assignments(organization_id);
comment on table public.exam_assignments is 'Assignment of an exam to a specific student.';

-- ----------------------------------------------------------------------------
-- Exam sessions (a single student attempt)
-- ----------------------------------------------------------------------------
create table if not exists public.exam_sessions (
  id                uuid primary key default gen_random_uuid(),
  exam_id           uuid not null references public.exams(id) on delete cascade,
  assignment_id     uuid references public.exam_assignments(id) on delete set null,
  student_id        uuid not null references public.profiles(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  attempt_number    int not null default 1,
  status            public.session_status not null default 'not_started',
  question_order    jsonb not null default '[]'::jsonb,  -- frozen ordered question_ids
  current_index     int not null default 0,
  started_at        timestamptz,
  submitted_at      timestamptz,
  expires_at        timestamptz,
  total_time_seconds int,
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists exam_sessions_student_id_idx on public.exam_sessions(student_id);
create index if not exists exam_sessions_exam_id_idx on public.exam_sessions(exam_id);
create index if not exists exam_sessions_organization_id_idx on public.exam_sessions(organization_id);
create index if not exists exam_sessions_status_idx on public.exam_sessions(status);
comment on table public.exam_sessions is 'A single attempt of an exam by a student (supports resume).';

-- ----------------------------------------------------------------------------
-- Audio files (metadata for recordings stored in Supabase Storage)
-- ----------------------------------------------------------------------------
create table if not exists public.audio_files (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid references public.exam_sessions(id) on delete cascade,
  student_id       uuid references public.profiles(id) on delete set null,
  bucket           text not null default 'answer-audio',
  storage_path     text not null,
  mime_type        text,
  size_bytes       bigint,
  duration_seconds numeric,
  checksum         text,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists audio_files_session_id_idx on public.audio_files(session_id);
create index if not exists audio_files_organization_id_idx on public.audio_files(organization_id);
comment on table public.audio_files is 'Metadata for audio recordings stored in Supabase Storage.';

-- ----------------------------------------------------------------------------
-- Answers (one per question per session)
-- ----------------------------------------------------------------------------
create table if not exists public.answers (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.exam_sessions(id) on delete cascade,
  question_id      uuid not null references public.questions(id) on delete restrict,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  audio_file_id    uuid references public.audio_files(id) on delete set null,
  position         int,
  status           public.answer_status not null default 'pending',
  transcript       text,
  duration_seconds numeric,
  answered_at      timestamptz,
  skipped          boolean not null default false,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(session_id, question_id)
);
create index if not exists answers_session_id_idx on public.answers(session_id);
create index if not exists answers_question_id_idx on public.answers(question_id);
create index if not exists answers_organization_id_idx on public.answers(organization_id);
comment on table public.answers is 'A student answer to a single question within a session.';

-- ----------------------------------------------------------------------------
-- Evaluations (overall, one per session) - isolated evaluation module output
-- ----------------------------------------------------------------------------
create table if not exists public.evaluations (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null unique references public.exam_sessions(id) on delete cascade,
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  student_id           uuid references public.profiles(id) on delete set null,
  status               public.evaluation_status not null default 'pending',
  evaluator            public.evaluator_type not null default 'mock',
  evaluator_version    text,
  grammar_score        numeric(5,2),
  vocabulary_score     numeric(5,2),
  pronunciation_score  numeric(5,2),
  fluency_score        numeric(5,2),
  communication_score  numeric(5,2),
  overall_score        numeric(5,2),
  cefr_level           public.cefr_level,
  feedback             text,
  strengths            text[],
  improvements         text[],
  raw_result           jsonb,
  error                text,
  requested_at         timestamptz not null default now(),
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists evaluations_session_id_idx on public.evaluations(session_id);
create index if not exists evaluations_organization_id_idx on public.evaluations(organization_id);
create index if not exists evaluations_student_id_idx on public.evaluations(student_id);
comment on table public.evaluations is 'Overall evaluation for a session. Produced by the pluggable evaluation module.';

-- ----------------------------------------------------------------------------
-- Answer evaluations (per-question scores)
-- ----------------------------------------------------------------------------
create table if not exists public.answer_evaluations (
  id                   uuid primary key default gen_random_uuid(),
  evaluation_id        uuid not null references public.evaluations(id) on delete cascade,
  answer_id            uuid not null references public.answers(id) on delete cascade,
  question_id          uuid references public.questions(id) on delete set null,
  grammar_score        numeric(5,2),
  vocabulary_score     numeric(5,2),
  pronunciation_score  numeric(5,2),
  fluency_score        numeric(5,2),
  communication_score  numeric(5,2),
  overall_score        numeric(5,2),
  cefr_level           public.cefr_level,
  feedback             text,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  unique(evaluation_id, answer_id)
);
create index if not exists answer_evaluations_evaluation_id_idx on public.answer_evaluations(evaluation_id);
create index if not exists answer_evaluations_answer_id_idx on public.answer_evaluations(answer_id);
comment on table public.answer_evaluations is 'Per-question scores that roll up into an evaluation.';

-- ----------------------------------------------------------------------------
-- Reports
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid references public.exam_sessions(id) on delete cascade,
  evaluation_id    uuid references public.evaluations(id) on delete set null,
  student_id       uuid references public.profiles(id) on delete set null,
  exam_id          uuid references public.exams(id) on delete set null,
  report_type      text not null default 'candidate',
  title            text,
  data             jsonb not null default '{}'::jsonb,   -- denormalized snapshot for PDF
  pdf_path         text,
  status           public.report_status not null default 'ready',
  generated_by     uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists reports_organization_id_idx on public.reports(organization_id);
create index if not exists reports_session_id_idx on public.reports(session_id);
create index if not exists reports_student_id_idx on public.reports(student_id);
comment on table public.reports is 'Generated candidate/exam reports (PDF-ready snapshots).';

-- ----------------------------------------------------------------------------
-- Invitations (org member & student invitations, exam codes)
-- ----------------------------------------------------------------------------
create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  email            citext,
  role             text not null default 'student' references public.roles(key),
  token            text not null unique,
  code             text unique,                    -- short human-friendly code
  exam_id          uuid references public.exams(id) on delete set null,
  status           public.invitation_status not null default 'pending',
  invited_by       uuid references public.profiles(id) on delete set null,
  accepted_by      uuid references public.profiles(id) on delete set null,
  expires_at       timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists invitations_organization_id_idx on public.invitations(organization_id);
create index if not exists invitations_email_idx on public.invitations(email);
create index if not exists invitations_code_idx on public.invitations(code);
comment on table public.invitations is 'Invitation & exam-code records for onboarding students/admins.';

-- ----------------------------------------------------------------------------
-- Audit logs
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  actor_id         uuid references public.profiles(id) on delete set null,
  action           text not null,
  entity_type      text,
  entity_id        uuid,
  description      text,
  ip               inet,
  user_agent       text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists audit_logs_organization_id_idx on public.audit_logs(organization_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
comment on table public.audit_logs is 'Immutable audit trail of security-relevant actions.';
