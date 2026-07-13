# English Speaking Assessment Platform

A production-oriented MVP for evaluating a student's spoken English through
structured, **database-driven** speaking exams. Students answer predefined
questions with their microphone; responses are stored in Supabase Storage and
scored by a **pluggable evaluation engine** that is designed to be swapped for a
real AI/speech service with minimal changes.

> Interview questions come **only** from the question bank in the database. The
> system never generates its own questions.

Built entirely on **React + Vite + TypeScript** and **Supabase** (PostgreSQL,
Auth, Storage, Edge Functions, RLS) — no separate Node/Java/.NET backend.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database schema](#database-schema)
- [Security model](#security-model)
- [The evaluation module (future-ready AI)](#the-evaluation-module-future-ready-ai)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Deploying the backend (Supabase)](#deploying-the-backend-supabase)
- [Deploying the frontend](#deploying-the-frontend)
- [Demo accounts](#demo-accounts)
- [Roadmap](#roadmap)

---

## Features

### Roles (RBAC)
- **Super Admin** — platform-wide: organizations, users, global question bank, storage/usage stats.
- **Organization Admin** — question bank, exam templates, published exams, students, results & reports.
- **Student** — their single active exam, microphone test, exam taking, results & CEFR feedback.

### Account / profile
Every signed-in user has a **Profile** page to edit their name, phone, preferred
language and first language, and to change their password (email, role and
organization are read-only and protected server-side).

### Student access gating (one-time exams)
A student can only enter the app while they have an **active, takeable exam**
(exam status `active`, assignment not yet submitted, within its window). Their home
is that exam. Once they complete it, access is revoked — they see a locked
"No active exam" screen and regain access automatically only when an administrator
assigns them a new active exam. The exam-taking flow itself stays reachable through
completion so the student always sees their result.

### Authentication
- Email/password login, logout, forgot-password + reset flow.
- Organization-based membership (each user belongs to one organization; super admins are org-independent).
- Student join via **exam code** or **invitation code**.
- Secure, auto-refreshing sessions (PKCE).

### Student flow
Login → land on the assigned active exam → read instructions → **test microphone** →
start exam → answer predefined speaking questions (prep timer + recording timer) →
auto-saved progress → submit → view results (if enabled by the exam). After completing
their one-time exam, the student is locked out until a new active exam is assigned.

### Question bank
Title, description, question text, optional audio prompt, CEFR level, difficulty,
category, tags, prep/answer time limits, active/inactive status. Categories,
randomization and reuse across multiple exam templates.

### Exam templates & exams
Templates define the question set, order, randomization, passing score, time limits,
retake policy and result visibility. **Exams** are published instances of a template,
each with a shareable join code, that get assigned to students. Every exam has a
required **expiration** (`available_until`) and an optional open date — after the
deadline, students can no longer start or resume it (enforced both in the
`start_exam_session` RPC and the student access gate). Admins can edit an exam's
schedule at any time.

### Answer recording
Records with the MediaRecorder API, uploads audio to a private Supabase Storage
bucket, saves metadata to PostgreSQL, auto-saves progress per question, and supports
resuming after a disconnect.

### Evaluation
Stores grammar, vocabulary, pronunciation, fluency, communication and overall scores,
a CEFR level, textual feedback, strengths and improvements — both per session and per
question. The evaluation code is fully isolated (see below).

### Dashboards
- **Student:** exams to take, completed count, average score, latest CEFR, recent results.
- **Organization:** students, average score, pass rate, exam completion, CEFR distribution.
- **Super Admin:** organizations, active users, exams, sessions, evaluations, storage usage.

### Reports
Printable candidate report (candidate info, exam info, per-question scores, overall
score, CEFR, recommendations) with browser **Print → Save as PDF**.

### UI/UX
Tailwind CSS + shadcn-style components, dark/light/system theme, responsive layout,
accessible primitives (Radix), toasts, skeleton loading states.

---

## Tech stack

| Layer        | Choice                                                             |
|--------------|-------------------------------------------------------------------|
| Frontend     | React 18, Vite, TypeScript                                        |
| Styling / UI | Tailwind CSS, shadcn-style components on Radix UI, lucide-react   |
| Data fetching| TanStack React Query                                              |
| Forms        | React Hook Form + Zod                                             |
| Routing      | React Router v6 (lazy-loaded routes)                             |
| Backend      | Supabase — PostgreSQL, Auth, Storage, Realtime, Edge Functions   |
| Auth         | Supabase Auth (email/password, PKCE)                             |
| Hosting      | Vercel / Cloudflare Pages (frontend) + Supabase (backend)        |

---

## Architecture

```
┌────────────────────────── Browser (React + Vite) ─────────────────────────┐
│  Feature modules (auth, questions, exams, exam-session, dashboard,         │
│  students, reports, organizations)                                        │
│      │ React Query hooks           │ Evaluation service (interface)       │
│      ▼                             ▼                                       │
│  supabase-js client  ───────────────────────────────────────────────►     │
└──────────────┬──────────────────────────────────────────────┬────────────┘
               │ PostgREST / Auth / Storage (RLS-enforced)     │ functions.invoke
               ▼                                                ▼
┌──────────────────────── Supabase project ─────────────────────────────────┐
│  PostgreSQL (RLS, RBAC helper fns, exam-flow RPCs, triggers, audit)        │
│  Auth (auth.users)   Storage (answer-audio, question-audio buckets)        │
│  Edge Function `evaluate-session`  ← isolated scoring engine (service role)│
└────────────────────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **Questions are never exposed wholesale to students.** Students receive only the
  questions in their own session through the `get_session_detail` SECURITY DEFINER
  RPC, which enforces ownership. Admins manage the bank through RLS-guarded tables.
- **Exam-flow business logic lives in the database** as SECURITY DEFINER RPCs
  (`start_exam_session`, `get_session_detail`, `submit_exam_session`) so that
  randomization is frozen server-side and rules can't be bypassed by the client.
- **The evaluation engine is isolated** behind a single interface and runs in an
  Edge Function, so it can be replaced by a real AI service without touching the app.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for more detail.

---

## Database schema

Normalized PostgreSQL with UUID primary keys, foreign keys, indexes, `created_at` /
`updated_at` timestamps, `deleted_at` soft deletes where appropriate, and Row Level
Security on every table.

`organizations`, `roles`, `profiles` (users), `categories`, `questions`,
`exam_templates`, `exam_questions`, `exams`, `exam_assignments`, `exam_sessions`,
`audio_files`, `answers`, `evaluations`, `answer_evaluations`, `reports`,
`invitations`, `audit_logs`.

Full table-by-table reference: [`docs/DATABASE.md`](docs/DATABASE.md).

---

## Security model

- **Supabase Auth** for identity; a trigger creates a `profiles` row on sign-up and
  derives role/organization **from a pre-existing invitation** — a user can never
  self-assign an elevated role.
- **Row Level Security** on all tables with role-scoped policies:
  super admin → everything; org admin → their organization; student → only their own
  sessions/answers/results and the exams assigned to them.
- **RBAC helper functions** (`is_super_admin`, `is_org_admin_of`, `current_org_id`, …)
  are `SECURITY DEFINER` and pin `search_path`; a trigger prevents non-admins from
  editing privileged profile columns.
- **Secure file uploads**: private Storage buckets with path-scoped policies
  (`{org}/{student}/{session}/…`); playback via short-lived signed URLs.
- **Input validation** with Zod on every form; **audit logging** via `log_audit_event`.
- Run `get_advisors` after schema changes; this project ships with no RLS gaps.

---

## The evaluation module (future-ready AI)

Everything the app knows about evaluation is the `EvaluationProvider` interface in
`src/features/evaluation/service`. The default provider calls the
`evaluate-session` Edge Function, which currently runs a **deterministic mock scorer**.

To integrate a real AI/speech pipeline:

1. Replace `scoreSession()` in `supabase/functions/evaluate-session/index.ts` with
   calls to your provider (transcription + scoring). Keep writing to `evaluations`
   and `answer_evaluations`.
2. (Optional) point `evaluationService` at a different provider implementation.

No frontend or database changes are required — the request/response contract and all
downstream dashboards/reports stay identical.

---

## Folder structure

```
.
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn-style primitives (button, dialog, table, …)
│   │   ├── layout/          # AppShell, Sidebar, AuthLayout, FocusLayout, ThemeToggle
│   │   ├── common/          # PageHeader, StatCard, CefrBadge, ScoreBar, guards
│   │   └── theme/           # ThemeProvider (dark/light/system)
│   ├── features/
│   │   ├── auth/            # AuthProvider, login/forgot/reset/join pages
│   │   ├── profile/         # per-user profile & password management
│   │   ├── dashboard/       # role-based dashboards + stats
│   │   ├── questions/       # question bank management
│   │   ├── exams/           # templates + published exams + assignment
│   │   ├── exam-session/    # student exam runner (recording, autosave, submit)
│   │   ├── student/         # student dashboard / exams / results
│   │   ├── evaluation/      # isolated evaluation service (pluggable)
│   │   ├── results/         # shared evaluation summary + result page
│   │   ├── reports/         # org results list + printable candidate report
│   │   ├── students/        # student management + invitations
│   │   └── organizations/   # super-admin org & user management
│   ├── lib/                 # supabase client, types, constants, audio, utils
│   ├── App.tsx              # routes
│   └── main.tsx             # providers + entry
├── supabase/
│   ├── migrations/          # 0001–0009 schema, RLS, RPCs, storage, seed
│   └── functions/
│       └── evaluate-session/# isolated evaluation Edge Function
├── docs/                    # ARCHITECTURE.md, DATABASE.md
├── vercel.json              # SPA rewrites for Vercel
└── public/_redirects        # SPA rewrites for Cloudflare Pages / Netlify
```

---

## Getting started

### Prerequisites
- Node.js 18+ (project developed on Node 22)
- A Supabase project (or the Supabase CLI for local development)

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Set:
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your publishable/anon key>
```

### 3. Run
```bash
npm run dev      # http://localhost:5173
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # preview the production build
```

---

## Deploying the backend (Supabase)

The database schema, RLS, RPCs, storage buckets and seed data are versioned as SQL
migrations in `supabase/migrations`. With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push                     # applies migrations 0001–0009
supabase functions deploy evaluate-session
```

`0007_seed_demo_users.sql` creates three demo accounts (see below). Remove or skip it
for a clean production database.

> This repository's migrations were authored and applied against a live Supabase
> project during development, so the schema, policies, storage buckets and Edge
> Function are already provisioned there.

---

## Deploying the frontend

**Vercel** (`vercel.json` included):
- Framework preset: Vite. Build `npm run build`, output `dist`.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.

**Cloudflare Pages** (`public/_redirects` included):
- Build command `npm run build`, output directory `dist`, same env variables.

Both configs include an SPA fallback so client-side routes work on refresh.

---

## Demo accounts

Seeded by `0007_seed_demo_users.sql`. Password for all three: **`Password123!`**

| Role         | Email                  |
|--------------|------------------------|
| Super Admin  | superadmin@demo.test   |
| Org Admin    | admin@demo.test        |
| Student      | student@demo.test      |

The student is pre-assigned the demo exam **“General English Speaking Assessment”**
(join code **`DEMO2026`**). The login screen has one-click buttons to fill each demo
account.

---

## Roadmap

- Real AI evaluation provider (speech-to-text + LLM scoring) behind the existing interface.
- Server-side PDF report generation and email delivery (invitations, reminders, results).
- Realtime proctoring signals and richer analytics.
- Per-organization evaluation-provider configuration.
- Question audio prompt uploads via the `question-audio` bucket UI.

---

Built with React, Vite, TypeScript and Supabase.
