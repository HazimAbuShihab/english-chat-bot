import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

// -------------------------------- Templates --------------------------------

export interface TemplateWithCount extends Tables<"exam_templates"> {
  exam_questions: { count: number }[];
}

export async function listTemplates(orgId: string): Promise<TemplateWithCount[]> {
  const { data, error } = await supabase
    .from("exam_templates")
    .select("*, exam_questions(count)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TemplateWithCount[];
}

export interface TemplateQuestion extends Tables<"exam_questions"> {
  question: Pick<Tables<"questions">, "id" | "title" | "question_text" | "cefr_level" | "difficulty" | "time_limit_seconds"> | null;
}

export async function getTemplateQuestions(templateId: string): Promise<TemplateQuestion[]> {
  const { data, error } = await supabase
    .from("exam_questions")
    .select("*, question:questions(id, title, question_text, cefr_level, difficulty, time_limit_seconds)")
    .eq("template_id", templateId)
    .order("position");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    question: Array.isArray(r.question) ? r.question[0] ?? null : r.question,
  })) as TemplateQuestion[];
}

export async function createTemplate(input: TablesInsert<"exam_templates">) {
  const { data, error } = await supabase.from("exam_templates").insert(input).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(id: string, patch: Partial<TablesInsert<"exam_templates">>) {
  const { error } = await supabase.from("exam_templates").update(patch).eq("id", id);
  if (error) throw error;
}

/** Replace a template's question set with the given ordered ids. */
export async function setTemplateQuestions(templateId: string, questionIds: string[]) {
  const { error: delErr } = await supabase.from("exam_questions").delete().eq("template_id", templateId);
  if (delErr) throw delErr;
  if (questionIds.length === 0) return;
  const rows = questionIds.map((qid, i) => ({ template_id: templateId, question_id: qid, position: i + 1 }));
  const { error: insErr } = await supabase.from("exam_questions").insert(rows);
  if (insErr) throw insErr;
}

export async function softDeleteTemplate(id: string) {
  const { error } = await supabase
    .from("exam_templates")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------- Exams ----------------------------------

export interface ExamWithMeta extends Tables<"exams"> {
  template: { title: string } | null;
  exam_assignments: { count: number }[];
}

export async function listExams(orgId: string): Promise<ExamWithMeta[]> {
  const { data, error } = await supabase
    .from("exams")
    .select("*, template:exam_templates(title), exam_assignments(count)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((e) => ({
    ...e,
    template: Array.isArray(e.template) ? e.template[0] ?? null : e.template,
  })) as ExamWithMeta[];
}

/** Create a published exam from a template, snapshotting its rules into settings. */
export async function createExamFromTemplate(params: {
  template: Tables<"exam_templates">;
  orgId: string;
  createdBy: string;
  title: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  status?: Tables<"exams">["status"];
}) {
  const t = params.template;

  // Does this template include any spoken question? Drives the mic requirement.
  const { count: speakingCount } = await supabase
    .from("exam_questions")
    .select("id, questions!inner(question_type)", { count: "exact", head: true })
    .eq("template_id", t.id)
    .eq("questions.question_type", "speaking");

  const settings = {
    instructions: t.instructions,
    randomize_questions: t.randomize_questions,
    randomize_categories: t.randomize_categories,
    question_count: t.question_count ?? 0,
    total_time_limit_seconds: t.total_time_limit_seconds ?? 0,
    requires_microphone: (speakingCount ?? 0) > 0,
  };
  const { data, error } = await supabase
    .from("exams")
    .insert({
      organization_id: params.orgId,
      template_id: t.id,
      title: params.title,
      description: t.description,
      join_code: await freshJoinCode(),
      status: params.status ?? "active",
      available_from: params.availableFrom ?? null,
      available_until: params.availableUntil ?? null,
      settings,
      passing_score: t.passing_score,
      max_attempts: t.max_attempts,
      show_results_to_student: t.show_results_to_student,
      created_by: params.createdBy,
    })
    .select("id, join_code")
    .single();
  if (error) throw error;
  return data;
}

async function freshJoinCode(): Promise<string> {
  // Generate a short code and rely on the unique constraint; retry on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase.rpc("generate_code", { len: 8 });
    const code = (data as string) ?? Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: existing } = await supabase.from("exams").select("id").eq("join_code", code).maybeSingle();
    if (!existing) return code;
  }
  return `EX${Date.now().toString(36).toUpperCase()}`;
}

export async function updateExam(id: string, patch: Partial<TablesInsert<"exams">>) {
  const { error } = await supabase.from("exams").update(patch).eq("id", id);
  if (error) throw error;
}

export async function assignStudents(params: {
  examId: string;
  orgId: string;
  studentIds: string[];
  assignedBy: string;
}) {
  const rows = params.studentIds.map((sid) => ({
    exam_id: params.examId,
    student_id: sid,
    organization_id: params.orgId,
    assigned_by: params.assignedBy,
    status: "assigned" as const,
  }));
  const { error } = await supabase.from("exam_assignments").upsert(rows, { onConflict: "exam_id,student_id", ignoreDuplicates: true });
  if (error) throw error;
}

export interface ExamAssignmentRow extends Tables<"exam_assignments"> {
  student: { id: string; full_name: string | null; email: string | null } | null;
}

export async function listExamAssignments(examId: string): Promise<ExamAssignmentRow[]> {
  const { data, error } = await supabase
    .from("exam_assignments")
    .select("*, student:profiles(id, full_name, email)")
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    student: Array.isArray(r.student) ? r.student[0] ?? null : r.student,
  })) as ExamAssignmentRow[];
}
