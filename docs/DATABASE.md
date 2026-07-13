# Database reference

PostgreSQL (Supabase). All tables use UUID primary keys (`gen_random_uuid()`),
`created_at`/`updated_at` timestamps (with an `updated_at` trigger), foreign keys,
targeted indexes, and Row Level Security. Tables that support soft delete carry a
`deleted_at` column. Tenancy flows through `organization_id`.

## Enums

| Enum                | Values |
|---------------------|--------|
| `cefr_level`        | A1, A2, B1, B2, C1, C2 |
| `difficulty_level`  | easy, medium, hard |
| `template_status`   | draft, published, archived |
| `exam_status`       | draft, scheduled, active, closed, archived |
| `assignment_status` | assigned, started, submitted, evaluated, expired, cancelled |
| `session_status`    | not_started, in_progress, submitted, abandoned, evaluating, evaluated, expired |
| `answer_status`     | pending, recorded, uploaded, skipped |
| `evaluation_status` | pending, processing, completed, failed |
| `evaluator_type`    | mock, manual, ai |
| `retake_policy`     | none, limited, unlimited |
| `invitation_status` | pending, accepted, expired, revoked |
| `report_status`     | pending, ready, failed |

## Tables

### `roles`
Lookup for RBAC. `key` ∈ {super_admin, org_admin, student}, `name`, `description`, `rank`.

### `organizations`
Tenant. `name`, unique `slug`, contact fields, `plan`, `max_students`, `settings jsonb`,
`is_active`, soft delete.

### `profiles` (application users)
PK references `auth.users(id)`. `organization_id` (null for super admins), `role`
(FK → `roles.key`), `email`, `full_name`, `avatar_url`, `phone`, `locale`,
`native_language`, `status`, `last_seen_at`, `metadata`, soft delete.

### `categories`
Question categories. `organization_id` null = **global**. Unique `(organization_id, slug)`
for org categories and a partial unique index on `slug` for global ones.

### `questions` (the question bank)
`organization_id` null = global. `category_id`, `title`, `description`, `question_text`,
`audio_url`, `cefr_level`, `difficulty`, `tags text[]`, `prep_time_seconds`,
`time_limit_seconds`, `max_score`, `is_active`, `created_by`, soft delete.
Indexed on org, category, CEFR, difficulty, active, and a GIN index on tags.

### `exam_templates`
Reusable blueprint. `title`, `description`, `instructions`, `randomize_questions`,
`randomize_categories`, `question_count`, `passing_score`, `total_time_limit_seconds`,
`retake_policy`, `max_attempts`, `show_results_to_student`, `status`, soft delete.

### `exam_questions`
Template ↔ question join. `template_id`, `question_id`, `position`, `is_required`,
`points` / `time_limit_seconds` overrides. Unique `(template_id, question_id)`.

### `exams`
Published instance of a template. `template_id`, `title`, `description`, unique
`join_code`, `status`, `available_from/until`, `settings jsonb` (snapshot of template
rules), `passing_score`, `max_attempts`, `show_results_to_student`, soft delete.

### `exam_assignments`
Assignment of an exam to a student. `exam_id`, `student_id`, `organization_id`,
`status`, `attempts_used`, `assigned_by`, `due_at`, `invited_at`. Unique `(exam_id, student_id)`.

### `exam_sessions`
A single attempt. `exam_id`, `assignment_id`, `student_id`, `organization_id`,
`attempt_number`, `status`, `question_order jsonb` (frozen ordered question ids),
`current_index`, `started_at`, `submitted_at`, `expires_at`, `total_time_seconds`, `meta`.

### `audio_files`
Metadata for recordings in Storage. `organization_id`, `session_id`, `student_id`,
`bucket`, `storage_path`, `mime_type`, `size_bytes`, `duration_seconds`, `checksum`,
`uploaded_by`.

### `answers`
One per question per session. `session_id`, `question_id`, `organization_id`,
`audio_file_id`, `position`, `status`, `transcript`, `duration_seconds`, `answered_at`,
`skipped`, `meta`. Unique `(session_id, question_id)`.

### `evaluations`
Overall evaluation per session (unique `session_id`). Five sub-scores
(grammar/vocabulary/pronunciation/fluency/communication) + `overall_score`,
`cefr_level`, `feedback`, `strengths[]`, `improvements[]`, `evaluator`,
`evaluator_version`, `raw_result jsonb`, `status`, `requested_at`, `completed_at`.

### `answer_evaluations`
Per-question scores rolling up into an evaluation. Unique `(evaluation_id, answer_id)`.

### `reports`
Denormalized snapshot for candidate reports / future PDF export. `session_id`,
`evaluation_id`, `student_id`, `exam_id`, `report_type`, `data jsonb`, `pdf_path`,
`status`. Unique `(session_id, report_type)`.

### `invitations`
Onboarding / exam codes. `organization_id`, `email`, `role`, unique `token`, unique
`code`, `exam_id`, `status`, `invited_by`, `accepted_by`, `expires_at`, `accepted_at`.

### `audit_logs`
Immutable trail. `organization_id`, `actor_id`, `action`, `entity_type`, `entity_id`,
`description`, `ip`, `user_agent`, `metadata`, `created_at`.

## Functions

### RBAC helpers (SECURITY DEFINER, `search_path` pinned)
`current_role_key()`, `current_org_id()`, `is_super_admin()`, `is_org_admin()`,
`is_org_member(org)`, `is_org_admin_of(org)` — used inside RLS policies.

### Triggers
- `set_updated_at()` on all mutable tables.
- `handle_new_user()` on `auth.users` — creates the profile, applies role/org from a
  pending invitation.
- `protect_profile_columns()` — stops non-admins changing `role`/`organization_id`/`status`.

### Exam-flow RPCs (SECURITY DEFINER)
- `start_exam_session(p_exam_id)` — validate assignment/attempts/window, freeze a
  (optionally randomized) question order, create the session.
- `get_session_detail(p_session_id)` — return the session, exam, and **only this
  session's** ordered questions + existing answers (ownership enforced).
- `submit_exam_session(p_session_id)` — finalize the attempt, create a pending evaluation.

### Dashboard RPCs
- `org_dashboard_stats(p_org)` — students, exams, completion, average score, pass rate,
  CEFR distribution (org admin only).
- `platform_stats()` — organizations, users, exams, sessions, evaluations, storage
  (super admin only).

### Utilities
- `generate_code(len)` — human-friendly codes. `log_audit_event(...)` — audit writes.

## Storage buckets

| Bucket           | Visibility | Path convention                                   |
|------------------|-----------|----------------------------------------------------|
| `answer-audio`   | private   | `{organization_id}/{student_id}/{session_id}/{q}.{ext}` |
| `question-audio` | private   | `{organization_id \| 'global'}/{question_id}/{file}`    |

Storage policies are text-based on the folder segments (no unsafe casts of
attacker-controlled paths). Students upload only under their own org/user prefix;
admins read their organization's files; playback uses short-lived signed URLs.

## RLS summary

- **super_admin** — full access to every organization.
- **org_admin** — full access scoped to their organization.
- **student** — read/write only their own sessions/answers/results; read the exams
  assigned to them. The question bank is not directly readable by students.
- **service_role** (Edge Function) bypasses RLS to write evaluations.
