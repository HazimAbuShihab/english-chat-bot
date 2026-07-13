import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/lib/database.types";

export interface AssignmentWithExam extends Tables<"exam_assignments"> {
  exam: Pick<
    Tables<"exams">,
    "id" | "title" | "description" | "status" | "available_from" | "available_until" | "passing_score" | "max_attempts"
  > | null;
}

/** All exams assigned to a student, most recent first. */
export async function getMyAssignments(studentId: string): Promise<AssignmentWithExam[]> {
  const { data, error } = await supabase
    .from("exam_assignments")
    .select(
      "*, exam:exams(id, title, description, status, available_from, available_until, passing_score, max_attempts)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AssignmentWithExam[];
}

export interface ResultRow {
  id: string;
  status: Enums<"session_status">;
  submitted_at: string | null;
  created_at: string;
  exam: { id: string; title: string; passing_score: number; show_results_to_student: boolean } | null;
  evaluation: { overall_score: number | null; cefr_level: Enums<"cefr_level"> | null; status: Enums<"evaluation_status"> } | null;
}

/** A student's session history with attached evaluation summary. */
export async function getMySessions(studentId: string): Promise<ResultRow[]> {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      "id, status, submitted_at, created_at, exam:exams(id, title, passing_score, show_results_to_student), evaluation:evaluations(overall_score, cefr_level, status)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Supabase types the nested to-one relations as arrays in some versions; normalize.
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    exam: Array.isArray(r.exam) ? r.exam[0] ?? null : r.exam,
    evaluation: Array.isArray(r.evaluation) ? r.evaluation[0] ?? null : r.evaluation,
  })) as ResultRow[];
}
