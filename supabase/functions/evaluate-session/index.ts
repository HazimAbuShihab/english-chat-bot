// =============================================================================
// Edge Function: evaluate-session
// =============================================================================
// Isolated evaluation engine.
//   * Multiple-choice answers are graded OBJECTIVELY by correctness (real).
//   * Speaking answers are scored by a DETERMINISTIC MOCK today — replace
//     scoreSpeaking() with a real speech/LLM pipeline; nothing else changes.
// The two are blended (weighted by question count) into the overall score.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVALUATOR_VERSION = "mock-1.1.0";

type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function clamp(n: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
function cefrFromScore(score: number): Cefr {
  if (score < 35) return "A1";
  if (score < 50) return "A2";
  if (score < 63) return "B1";
  if (score < 76) return "B2";
  if (score < 88) return "C1";
  return "C2";
}
function setEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

interface QuestionRow { id: string; question_type: string; correct_option_keys: string[] | null; }
interface AnswerRow {
  id: string; question_id: string; status: string; skipped: boolean;
  duration_seconds: number | null; audio_file_id: string | null; selected_options: string[] | null;
}

const DIMS = ["grammar", "vocabulary", "pronunciation", "fluency", "communication"] as const;

/** Deterministic mock scoring for the speaking portion of a session. */
function scoreSpeaking(sessionId: string, speakingTotal: number, speakingAnswers: AnswerRow[]) {
  const answered = speakingAnswers.filter(
    (a) => !a.skipped && (a.audio_file_id || a.status === "uploaded" || a.status === "recorded"),
  );
  const engagement = speakingTotal > 0 ? answered.length / speakingTotal : 0;
  const avgDuration = answered.length > 0
    ? answered.reduce((s, a) => s + (a.duration_seconds ?? 0), 0) / answered.length
    : 0;
  const durationScore = clamp(40 + Math.min(avgDuration, 90) * 0.6);
  const base = 45 + engagement * 35;

  const scores: Record<string, number> = {};
  for (const dim of DIMS) {
    const jitter = (hash(sessionId + dim) % 16) - 6;
    let v = base + jitter;
    if (dim === "fluency") v = (v + durationScore) / 2;
    scores[dim] = round1(clamp(v));
  }
  const overall = round1((scores.grammar + scores.vocabulary + scores.pronunciation + scores.fluency + scores.communication) / 5);
  return { scores, overall };
}

function narrative(mode: "mixed" | "speaking" | "mcq", overall: number, cefr: Cefr, mcq?: { correct: number; total: number }) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (mcq && mcq.total > 0) {
    const pct = Math.round((mcq.correct / mcq.total) * 100);
    (pct >= 70 ? strengths : improvements).push(`Answered ${mcq.correct} of ${mcq.total} multiple-choice questions correctly (${pct}%).`);
  }
  if (mode !== "mcq") {
    strengths.push("Attempted the spoken questions.");
    improvements.push("Speaking is scored by a placeholder engine until an AI evaluator is connected.");
  }
  const feedback =
    `Overall score ${overall} (estimated CEFR ${cefr}). ` +
    (mode === "mcq"
      ? "This exam was graded objectively from the multiple-choice answers."
      : mode === "mixed"
        ? "Multiple-choice answers were graded objectively; speaking was scored by an automated placeholder."
        : "Speaking was scored by an automated placeholder. Connect an AI evaluator for a real spoken assessment.");
  return { strengths, improvements, feedback };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const { session_id } = (await req.json().catch(() => ({}))) as { session_id?: string };
    if (!session_id) return json({ ok: false, message: "session_id is required" }, 400);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ ok: false, message: "Unauthorized" }, 401);
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: session, error: sErr } = await admin.from("exam_sessions")
      .select("id, student_id, organization_id, question_order, status, assignment_id, exam_id").eq("id", session_id).single();
    if (sErr || !session) return json({ ok: false, message: "Session not found" }, 404);

    const { data: caller } = await admin.from("profiles").select("role, organization_id").eq("id", uid).single();
    const isOwner = session.student_id === uid;
    const isAdmin = caller?.role === "super_admin" || (caller?.role === "org_admin" && caller?.organization_id === session.organization_id);
    if (!isOwner && !isAdmin) return json({ ok: false, message: "Forbidden" }, 403);

    const questionOrder: string[] = Array.isArray(session.question_order) ? session.question_order as string[] : [];

    const { data: questions } = await admin.from("questions")
      .select("id, question_type, correct_option_keys").in("id", questionOrder.length ? questionOrder : ["00000000-0000-0000-0000-000000000000"]);
    const { data: answers } = await admin.from("answers")
      .select("id, question_id, status, skipped, duration_seconds, audio_file_id, selected_options").eq("session_id", session_id);

    const qmap = new Map<string, QuestionRow>((questions ?? []).map((q) => [q.id, q as QuestionRow]));
    const amap = new Map<string, AnswerRow>((answers ?? []).map((a) => [a.question_id, a as AnswerRow]));

    const speakingIds = questionOrder.filter((id) => (qmap.get(id)?.question_type ?? "speaking") === "speaking");
    const mcqIds = questionOrder.filter((id) => qmap.get(id)?.question_type === "multiple_choice");

    // ---- Objective multiple-choice grading ----
    let mcqCorrect = 0;
    const mcqTotal = mcqIds.length;
    const perAnswer: Array<Record<string, unknown>> = [];
    const isCorrectUpdates: Array<{ id: string; is_correct: boolean }> = [];
    for (const qid of mcqIds) {
      const a = amap.get(qid);
      const correctKeys = qmap.get(qid)?.correct_option_keys ?? [];
      const correct = !!a && !a.skipped && setEquals(a.selected_options ?? [], correctKeys);
      if (correct) mcqCorrect++;
      if (a) {
        isCorrectUpdates.push({ id: a.id, is_correct: correct });
        perAnswer.push({ answer_id: a.id, question_id: qid, overall_score: correct ? 100 : 0 });
      }
    }
    const mcqScore = mcqTotal > 0 ? round1((mcqCorrect / mcqTotal) * 100) : null;

    // ---- Speaking (mock) scoring ----
    const speakingTotal = speakingIds.length;
    const speakingAnswers = speakingIds.map((id) => amap.get(id)).filter(Boolean) as AnswerRow[];
    const speaking = speakingTotal > 0 ? scoreSpeaking(session_id, speakingTotal, speakingAnswers) : null;
    if (speaking) {
      for (const a of speakingAnswers) {
        const j = (hash(a.id) % 12) - 6;
        const per = (v: number) => round1(clamp(v + j));
        perAnswer.push({
          answer_id: a.id, question_id: a.question_id,
          grammar_score: per(speaking.scores.grammar), vocabulary_score: per(speaking.scores.vocabulary),
          pronunciation_score: per(speaking.scores.pronunciation), fluency_score: per(speaking.scores.fluency),
          communication_score: per(speaking.scores.communication), overall_score: per(speaking.overall),
        });
      }
    }

    // ---- Blend ----
    let overall: number;
    if (speaking && mcqScore != null) {
      overall = round1((speaking.overall * speakingTotal + mcqScore * mcqTotal) / (speakingTotal + mcqTotal));
    } else if (mcqScore != null) {
      overall = mcqScore;
    } else {
      overall = speaking?.overall ?? 0;
    }
    const cefr = cefrFromScore(overall);
    const mode: "mixed" | "speaking" | "mcq" = speaking && mcqTotal > 0 ? "mixed" : mcqTotal > 0 ? "mcq" : "speaking";
    const { strengths, improvements, feedback } = narrative(mode, overall, cefr, { correct: mcqCorrect, total: mcqTotal });

    const { data: evalRow, error: eErr } = await admin.from("evaluations").upsert({
      session_id, organization_id: session.organization_id, student_id: session.student_id,
      status: "completed", evaluator: "mock", evaluator_version: EVALUATOR_VERSION,
      grammar_score: speaking?.scores.grammar ?? null, vocabulary_score: speaking?.scores.vocabulary ?? null,
      pronunciation_score: speaking?.scores.pronunciation ?? null, fluency_score: speaking?.scores.fluency ?? null,
      communication_score: speaking?.scores.communication ?? null, overall_score: overall,
      cefr_level: cefr, mcq_score: mcqScore, mcq_correct: mcqTotal > 0 ? mcqCorrect : null, mcq_total: mcqTotal > 0 ? mcqTotal : null,
      feedback, strengths, improvements,
      raw_result: { speaking: speaking?.scores ?? null, mcq: { correct: mcqCorrect, total: mcqTotal, score: mcqScore } },
      completed_at: new Date().toISOString(),
    }, { onConflict: "session_id" }).select("id").single();
    if (eErr || !evalRow) return json({ ok: false, message: eErr?.message ?? "Failed to write evaluation" }, 500);

    if (perAnswer.length > 0) {
      await admin.from("answer_evaluations").upsert(
        perAnswer.map((p) => ({ evaluation_id: evalRow.id, cefr_level: null, ...p })),
        { onConflict: "evaluation_id,answer_id" },
      );
    }
    for (const u of isCorrectUpdates) {
      await admin.from("answers").update({ is_correct: u.is_correct }).eq("id", u.id);
    }

    await admin.from("exam_sessions").update({ status: "evaluated" }).eq("id", session_id);
    if (session.assignment_id) await admin.from("exam_assignments").update({ status: "evaluated" }).eq("id", session.assignment_id);

    await admin.from("reports").upsert({
      organization_id: session.organization_id, session_id, evaluation_id: evalRow.id,
      student_id: session.student_id, exam_id: session.exam_id, report_type: "candidate",
      status: "ready", data: { overall, cefr, mcq_score: mcqScore },
    }, { onConflict: "session_id,report_type" });

    return json({ ok: true, message: "Evaluation complete", evaluation_id: evalRow.id, cefr, overall, mcq_score: mcqScore });
  } catch (err) {
    return json({ ok: false, message: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
