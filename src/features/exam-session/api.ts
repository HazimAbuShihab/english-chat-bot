import { supabase, ANSWER_AUDIO_BUCKET } from "@/lib/supabase";
import type { Enums, Tables } from "@/lib/database.types";

export interface SessionQuestion {
  id: string;
  position: number;
  title: string;
  description: string | null;
  question_text: string;
  audio_url: string | null;
  cefr_level: Enums<"cefr_level">;
  difficulty: Enums<"difficulty_level">;
  prep_time_seconds: number;
  time_limit_seconds: number;
  answer: {
    id: string;
    status: Enums<"answer_status">;
    audio_file_id: string | null;
    skipped: boolean;
    duration_seconds: number | null;
    answered_at: string | null;
  } | null;
}

export interface SessionDetail {
  session: Tables<"exam_sessions">;
  exam: {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    show_results_to_student: boolean;
    settings: Record<string, unknown>;
  };
  questions: SessionQuestion[];
}

/** Start (or resume) an attempt for an exam. Returns the session id. */
export async function startExamSession(examId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_exam_session", { p_exam_id: examId });
  if (error) throw error;
  return data as string;
}

/** Fetch the full runner payload for a session. */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const { data, error } = await supabase.rpc("get_session_detail", { p_session_id: sessionId });
  if (error) throw error;
  return data as unknown as SessionDetail;
}

/** Persist the current question index (auto-save / resume support). */
export async function saveSessionProgress(sessionId: string, currentIndex: number) {
  const { error } = await supabase
    .from("exam_sessions")
    .update({ current_index: currentIndex, status: "in_progress" })
    .eq("id", sessionId);
  if (error) throw error;
}

export interface UploadAnswerParams {
  sessionId: string;
  questionId: string;
  organizationId: string;
  studentId: string;
  position: number;
  blob: Blob;
  extension: string;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Upload a recording to Storage, record its metadata, and upsert the answer.
 * Storage path follows {org}/{student}/{session}/{question}.{ext} which the
 * storage RLS policies enforce.
 */
export async function uploadAnswerAudio(params: UploadAnswerParams) {
  const path = `${params.organizationId}/${params.studentId}/${params.sessionId}/${params.questionId}.${params.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(ANSWER_AUDIO_BUCKET)
    .upload(path, params.blob, { contentType: params.mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: audioRow, error: audioError } = await supabase
    .from("audio_files")
    .insert({
      organization_id: params.organizationId,
      session_id: params.sessionId,
      student_id: params.studentId,
      bucket: ANSWER_AUDIO_BUCKET,
      storage_path: path,
      mime_type: params.mimeType,
      size_bytes: params.blob.size,
      duration_seconds: params.durationSeconds,
      uploaded_by: params.studentId,
    })
    .select("id")
    .single();
  if (audioError) throw audioError;

  const { error: answerError } = await supabase.from("answers").upsert(
    {
      session_id: params.sessionId,
      question_id: params.questionId,
      organization_id: params.organizationId,
      audio_file_id: audioRow.id,
      position: params.position,
      status: "uploaded",
      duration_seconds: params.durationSeconds,
      skipped: false,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "session_id,question_id" },
  );
  if (answerError) throw answerError;

  return audioRow.id;
}

/** Mark a question as skipped without a recording. */
export async function skipAnswer(params: {
  sessionId: string;
  questionId: string;
  organizationId: string;
  position: number;
}) {
  const { error } = await supabase.from("answers").upsert(
    {
      session_id: params.sessionId,
      question_id: params.questionId,
      organization_id: params.organizationId,
      position: params.position,
      status: "skipped",
      skipped: true,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "session_id,question_id" },
  );
  if (error) throw error;
}

/** Finalize the attempt and queue it for evaluation. */
export async function submitExamSession(sessionId: string) {
  const { error } = await supabase.rpc("submit_exam_session", { p_session_id: sessionId });
  if (error) throw error;
}

/** Create a short-lived signed URL to play back a stored recording. */
export async function getAnswerAudioUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(ANSWER_AUDIO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
