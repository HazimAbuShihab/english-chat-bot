// =============================================================================
// Edge Function: evaluate-session
// =============================================================================
// Isolated evaluation engine. Given a submitted session_id it computes a score
// breakdown, maps it to a CEFR level, writes an `evaluations` row (+ per-answer
// `answer_evaluations`) and marks the session evaluated.
//
// This is a DETERMINISTIC MOCK today. To integrate a real AI/speech pipeline,
// replace `scoreSession()` with calls to your provider — the request/response
// contract and everything downstream stays the same.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVALUATOR_VERSION = "mock-1.0.0";

type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Breakdown {
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  fluency: number;
  communication: number;
  overall: number;
}

/** Small stable string hash so the same session always scores the same way. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function cefrFromScore(score: number): Cefr {
  if (score < 35) return "A1";
  if (score < 50) return "A2";
  if (score < 63) return "B1";
  if (score < 76) return "B2";
  if (score < 88) return "C1";
  return "C2";
}

interface AnswerRow {
  id: string;
  question_id: string;
  status: string;
  skipped: boolean;
  duration_seconds: number | null;
  audio_file_id: string | null;
}

/** Deterministic mock scoring based on engagement + answer durations. */
function scoreSession(sessionId: string, questionCount: number, answers: AnswerRow[]) {
  const answered = answers.filter((a) => !a.skipped && (a.audio_file_id || a.status === "uploaded" || a.status === "recorded"));
  const engagement = questionCount > 0 ? answered.length / questionCount : 0;

  const avgDuration =
    answered.length > 0
      ? answered.reduce((sum, a) => sum + (a.duration_seconds ?? 0), 0) / answered.length
      : 0;
  // Reward answers roughly 20–90s long; taper off outside that band.
  const durationScore = clamp(40 + Math.min(avgDuration, 90) * 0.6);

  const base = 45 + engagement * 35; // 45..80 from engagement alone
  const dims = ["grammar", "vocabulary", "pronunciation", "fluency", "communication"] as const;

  const scores: Record<string, number> = {};
  for (const dim of dims) {
    const jitter = (hash(sessionId + dim) % 16) - 6; // -6..+9
    let v = base + jitter;
    if (dim === "fluency") v = (v + durationScore) / 2;
    scores[dim] = Math.round(clamp(v) * 10) / 10;
  }
  const overall =
    Math.round(((scores.grammar + scores.vocabulary + scores.pronunciation + scores.fluency + scores.communication) / 5) * 10) / 10;

  const breakdown: Breakdown = {
    grammar: scores.grammar,
    vocabulary: scores.vocabulary,
    pronunciation: scores.pronunciation,
    fluency: scores.fluency,
    communication: scores.communication,
    overall,
  };

  const cefr = cefrFromScore(overall);
  const { strengths, improvements, feedback } = narrative(breakdown, cefr, engagement);
  return { breakdown, cefr, strengths, improvements, feedback, answered };
}

function narrative(b: Breakdown, cefr: Cefr, engagement: number) {
  const entries = [
    ["grammatical accuracy", b.grammar],
    ["vocabulary range", b.vocabulary],
    ["pronunciation and clarity", b.pronunciation],
    ["fluency and pace", b.fluency],
    ["overall communication", b.communication],
  ] as const;
  const sorted = [...entries].sort((a, c) => c[1] - a[1]);
  const strengths = sorted.slice(0, 2).map(([label]) => `Strong ${label}.`);
  const improvements = sorted
    .slice(-2)
    .map(([label]) => `Continue developing your ${label}.`);
  if (engagement < 0.6) improvements.unshift("Attempt every question fully to demonstrate your range.");

  const feedback =
    `The candidate performed at an estimated CEFR ${cefr} level with an overall score of ${b.overall}. ` +
    `Speaking showed ${sorted[0][0]} as a clear strength. ` +
    `Focus areas include ${sorted[sorted.length - 1][0]}. ` +
    `This is an automated placeholder assessment; a human or AI reviewer can refine these results.`;

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
    if (!session_id) {
      return json({ ok: false, message: "session_id is required" }, 400);
    }

    // Identify the caller from their JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ ok: false, message: "Unauthorized" }, 401);
    }
    const uid = userData.user.id;

    // Service-role client performs the privileged reads/writes.
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sErr } = await admin
      .from("exam_sessions")
      .select("id, student_id, organization_id, question_order, status, assignment_id, exam_id")
      .eq("id", session_id)
      .single();
    if (sErr || !session) return json({ ok: false, message: "Session not found" }, 404);

    // Authorize: the student who owns it, or an org admin / super admin.
    const { data: caller } = await admin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", uid)
      .single();
    const isOwner = session.student_id === uid;
    const isAdmin =
      caller?.role === "super_admin" ||
      (caller?.role === "org_admin" && caller?.organization_id === session.organization_id);
    if (!isOwner && !isAdmin) return json({ ok: false, message: "Forbidden" }, 403);

    const { data: answers } = await admin
      .from("answers")
      .select("id, question_id, status, skipped, duration_seconds, audio_file_id")
      .eq("session_id", session_id);

    const questionOrder = Array.isArray(session.question_order) ? session.question_order : [];
    const result = scoreSession(session_id, questionOrder.length, (answers ?? []) as AnswerRow[]);

    // Upsert the overall evaluation.
    const { data: evalRow, error: eErr } = await admin
      .from("evaluations")
      .upsert(
        {
          session_id,
          organization_id: session.organization_id,
          student_id: session.student_id,
          status: "completed",
          evaluator: "mock",
          evaluator_version: EVALUATOR_VERSION,
          grammar_score: result.breakdown.grammar,
          vocabulary_score: result.breakdown.vocabulary,
          pronunciation_score: result.breakdown.pronunciation,
          fluency_score: result.breakdown.fluency,
          communication_score: result.breakdown.communication,
          overall_score: result.breakdown.overall,
          cefr_level: result.cefr,
          feedback: result.feedback,
          strengths: result.strengths,
          improvements: result.improvements,
          raw_result: result.breakdown,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "session_id" },
      )
      .select("id")
      .single();
    if (eErr || !evalRow) return json({ ok: false, message: eErr?.message ?? "Failed to write evaluation" }, 500);

    // Per-answer scores (small variation around the overall breakdown).
    const answerEvals = (answers ?? []).map((a: AnswerRow) => {
      const j = (hash(a.id) % 12) - 6;
      const per = (v: number) => Math.round(clamp(v + j) * 10) / 10;
      return {
        evaluation_id: evalRow.id,
        answer_id: a.id,
        question_id: a.question_id,
        grammar_score: per(result.breakdown.grammar),
        vocabulary_score: per(result.breakdown.vocabulary),
        pronunciation_score: per(result.breakdown.pronunciation),
        fluency_score: per(result.breakdown.fluency),
        communication_score: per(result.breakdown.communication),
        overall_score: per(result.breakdown.overall),
        cefr_level: result.cefr,
      };
    });
    if (answerEvals.length > 0) {
      await admin.from("answer_evaluations").upsert(answerEvals, { onConflict: "evaluation_id,answer_id" });
    }

    // Advance session + assignment lifecycle.
    await admin.from("exam_sessions").update({ status: "evaluated" }).eq("id", session_id);
    if (session.assignment_id) {
      await admin.from("exam_assignments").update({ status: "evaluated" }).eq("id", session.assignment_id);
    }

    // Snapshot a candidate report for later PDF export.
    await admin.from("reports").upsert(
      {
        organization_id: session.organization_id,
        session_id,
        evaluation_id: evalRow.id,
        student_id: session.student_id,
        exam_id: session.exam_id,
        report_type: "candidate",
        status: "ready",
        data: { scores: result.breakdown, cefr: result.cefr },
      },
      { onConflict: "session_id,report_type" },
    );

    return json({ ok: true, message: "Evaluation complete", evaluation_id: evalRow.id, cefr: result.cefr });
  } catch (err) {
    return json({ ok: false, message: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
