# Architecture

## Overview

The platform is a single-page React application talking directly to Supabase.
There is **no custom application server** — all server-side logic lives in
PostgreSQL (RLS + functions/RPCs) and one Supabase Edge Function for evaluation.

```
React SPA ──► supabase-js ──► PostgREST/Auth/Storage (RLS) ──► PostgreSQL
                         └──► Edge Function (evaluate-session, service role)
```

## Layers

### 1. Presentation (`src/components`)
- `ui/` — shadcn-style primitives built on Radix (button, dialog, select, tabs,
  table, dropdown, switch, progress, avatar, …) styled with Tailwind + CSS variables.
- `layout/` — `AuthLayout` (public), `AppShell` (sidebar + top bar), `FocusLayout`
  (distraction-reduced exam runner), `ThemeToggle`, `Sidebar`, `UserMenu`.
- `common/` — cross-feature building blocks: `PageHeader`, `StatCard`, `EmptyState`,
  `CefrBadge`, `ScoreBar`/`ScoreRing`, and route guards (`ProtectedRoute`, `RoleGuard`).
- `theme/ThemeProvider` — light/dark/system with `prefers-color-scheme` + localStorage.

### 2. Features (`src/features/*`)
Feature-based modules, each owning its `api.ts`, hooks, and pages/components:
`auth`, `dashboard`, `questions`, `exams`, `exam-session`, `student`, `results`,
`reports`, `students`, `organizations`, `evaluation`.

Data access uses **TanStack React Query**; forms use **React Hook Form + Zod**.

### 3. Data / integration (`src/lib`)
- `supabase.ts` — the typed browser client (PKCE, persisted sessions).
- `database.types.ts` — generated types for end-to-end type safety.
- `audio.ts` — MediaRecorder wrapper; `constants.ts`, `utils.ts`.

### 4. Backend (`supabase/`)
- **Migrations** define schema, enums, indexes, RLS, RBAC helpers, exam-flow RPCs,
  storage buckets/policies, and seed data.
- **Edge Function** `evaluate-session` is the isolated evaluation engine.

## Authentication & session flow

1. User signs in with email/password (`supabase.auth.signInWithPassword`).
2. `AuthProvider` subscribes to `onAuthStateChange`, loads the `profiles` row, and
   exposes `{ session, user, profile, role, organizationId }` to the app.
3. Route guards:
   - `ProtectedRoute` requires a session.
   - `PublicOnlyRoute` bounces authenticated users away from `/login`.
   - `RoleGuard` restricts admin/super-admin routes.
4. A dashboard router renders the correct dashboard for the user's role.

New users get a `profiles` row from the `handle_new_user` trigger, which derives role
and organization from any pending **invitation** for that email (never from
client-supplied metadata).

## The exam-taking flow

```
/exam/:examId/intro   ── read instructions + microphone check
        │  start_exam_session(exam_id)          [SECURITY DEFINER RPC]
        ▼  (validates assignment, attempts, exam window; freezes randomized order)
/session/:sessionId   ── runner
        │  get_session_detail(session_id)       [returns only this session's questions]
        │  per question: prep timer → record → upload audio → upsert answer (auto-save)
        │  submit_exam_session(session_id)       [marks submitted, creates pending eval]
        ▼  requestEvaluation(session_id)         [invokes evaluate-session Edge Function]
/session/:sessionId/result  ── polls until evaluation completed, shows scores/CEFR
```

Because randomization and question delivery happen inside SECURITY DEFINER functions,
the client can neither see unassigned questions nor tamper with the frozen order.

## Evaluation isolation

```
UI ──► evaluationService.evaluate({ sessionId })   (src/features/evaluation/service)
          └─ edgeProvider ──► functions.invoke("evaluate-session")
                                   └─ scoreSession()  ← swap this for real AI
                                        writes evaluations + answer_evaluations + reports
```

The rest of the application depends only on the `EvaluationProvider` interface and the
shape of the `evaluations` table, so the scoring engine can change independently.

## Error handling & UX

- React Query surfaces loading/error states; skeletons for lists, spinners for pages.
- Mutations use toasts (Sonner) for success/error feedback.
- The exam runner auto-saves progress and supports resuming after disconnects.
