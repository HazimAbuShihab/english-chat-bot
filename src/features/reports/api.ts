import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/lib/database.types";

export interface OrgSessionRow {
  id: string;
  status: Enums<"session_status">;
  submitted_at: string | null;
  created_at: string;
  exam: { id: string; title: string; passing_score: number } | null;
  student: { id: string; full_name: string | null; email: string | null } | null;
  evaluation: { overall_score: number | null; cefr_level: Enums<"cefr_level"> | null; status: Enums<"evaluation_status"> } | null;
}

function unwrap<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listOrgSessions(orgId: string, examId?: string | null): Promise<OrgSessionRow[]> {
  let q = supabase
    .from("exam_sessions")
    .select(
      "id, status, submitted_at, created_at, exam:exams(id, title, passing_score), student:profiles(id, full_name, email), evaluation:evaluations(overall_score, cefr_level, status)",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (examId) q = q.eq("exam_id", examId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    exam: unwrap(r.exam),
    student: unwrap(r.student),
    evaluation: unwrap(r.evaluation),
  })) as OrgSessionRow[];
}

export interface AnswerEvaluationRow extends Tables<"answer_evaluations"> {
  question: { title: string; question_text: string } | null;
}

export interface ReportData {
  session: Tables<"exam_sessions">;
  student: Tables<"profiles"> | null;
  exam: Tables<"exams"> | null;
  evaluation: Tables<"evaluations"> | null;
  answerEvaluations: AnswerEvaluationRow[];
}

/** Everything needed to render a formal candidate report. */
export async function getReportData(sessionId: string): Promise<ReportData> {
  const { data: session, error } = await supabase.from("exam_sessions").select("*").eq("id", sessionId).single();
  if (error) throw error;

  const [{ data: student }, { data: exam }, { data: evaluation }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.student_id).maybeSingle(),
    supabase.from("exams").select("*").eq("id", session.exam_id).maybeSingle(),
    supabase.from("evaluations").select("*").eq("session_id", sessionId).maybeSingle(),
  ]);

  let answerEvaluations: AnswerEvaluationRow[] = [];
  if (evaluation) {
    const { data: ae } = await supabase
      .from("answer_evaluations")
      .select("*, question:questions(title, question_text)")
      .eq("evaluation_id", evaluation.id);
    answerEvaluations = ((ae ?? []) as any[]).map((r) => ({
      ...r,
      question: unwrap(r.question),
    })) as AnswerEvaluationRow[];
  }

  return { session, student, exam, evaluation, answerEvaluations };
}
