import { supabase } from "@/lib/supabase";
import type { EvaluationInput, EvaluationProvider } from "./types";

/**
 * Default provider: delegates to the `evaluate-session` Supabase Edge Function.
 * The function owns all scoring logic and writes results to `evaluations` /
 * `answer_evaluations` using the service role. Swapping in a real AI service is
 * a change to the Edge Function alone — this client stays identical.
 */
export const edgeEvaluationProvider: EvaluationProvider = {
  id: "mock",
  async evaluate({ sessionId }: EvaluationInput) {
    const { data, error } = await supabase.functions.invoke("evaluate-session", {
      body: { session_id: sessionId },
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: (data as { message?: string } | null)?.message };
  },
};
