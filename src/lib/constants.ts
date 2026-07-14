import type { Enums } from "./database.types";

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "Speaking Assessment Platform";

export type RoleKey = "super_admin" | "org_admin" | "student";

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  org_admin: "Organization Admin",
  student: "Student",
};

export const CEFR_LEVELS: Enums<"cefr_level">[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CEFR_LABELS: Record<Enums<"cefr_level">, string> = {
  A1: "A1 · Beginner",
  A2: "A2 · Elementary",
  B1: "B1 · Intermediate",
  B2: "B2 · Upper-Intermediate",
  C1: "C1 · Advanced",
  C2: "C2 · Proficient",
};

/** Tailwind classes per CEFR level for consistent badges/bars. */
export const CEFR_COLORS: Record<Enums<"cefr_level">, string> = {
  A1: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  A2: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  B1: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  B2: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  C1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  C2: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

export interface McqOption {
  key: string;
  text: string;
}

export const QUESTION_TYPES: Enums<"question_type">[] = ["speaking", "multiple_choice"];

export const QUESTION_TYPE_LABELS: Record<Enums<"question_type">, string> = {
  speaking: "Speaking (spoken answer)",
  multiple_choice: "Multiple choice",
};

export const DIFFICULTY_LEVELS: Enums<"difficulty_level">[] = ["easy", "medium", "hard"];

export const DIFFICULTY_LABELS: Record<Enums<"difficulty_level">, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const RETAKE_POLICIES: Enums<"retake_policy">[] = ["none", "limited", "unlimited"];

export const RETAKE_LABELS: Record<Enums<"retake_policy">, string> = {
  none: "No retakes",
  limited: "Limited attempts",
  unlimited: "Unlimited",
};

export const EXAM_STATUS_LABELS: Record<Enums<"exam_status">, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  closed: "Closed",
  archived: "Archived",
};

export const SESSION_STATUS_LABELS: Record<Enums<"session_status">, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  abandoned: "Abandoned",
  evaluating: "Evaluating",
  evaluated: "Evaluated",
  expired: "Expired",
};

/** The five speaking sub-skills the evaluation module scores. */
export const SCORE_DIMENSIONS = [
  { key: "grammar_score", label: "Grammar" },
  { key: "vocabulary_score", label: "Vocabulary" },
  { key: "pronunciation_score", label: "Pronunciation" },
  { key: "fluency_score", label: "Fluency" },
  { key: "communication_score", label: "Communication" },
] as const;
