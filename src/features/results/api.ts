import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export interface SessionResult {
  session: Tables<"exam_sessions">;
  exam: Pick<Tables<"exams">, "id" | "title" | "passing_score" | "show_results_to_student"> | null;
  evaluation: Tables<"evaluations"> | null;
  answerCount: number;
}

/** Fetch a session with its exam and (if present) evaluation. */
export async function getSessionResult(sessionId: string): Promise<SessionResult> {
  const { data: session, error } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;

  const [{ data: exam }, { data: evaluation }, { count }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, title, passing_score, show_results_to_student")
      .eq("id", session.exam_id)
      .maybeSingle(),
    supabase.from("evaluations").select("*").eq("session_id", sessionId).maybeSingle(),
    supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .neq("status", "skipped"),
  ]);

  return { session, exam, evaluation, answerCount: count ?? 0 };
}

/** A student's exam history (assignments joined with their latest session/eval). */
export async function getMyResults(studentId: string) {
  const { data, error } = await supabase
    .from("exam_sessions")
    .select("id, status, submitted_at, created_at, exam:exams(id, title, passing_score, show_results_to_student), evaluation:evaluations(overall_score, cefr_level, status)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
