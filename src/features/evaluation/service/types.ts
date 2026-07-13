// =============================================================================
// Evaluation module — public contract
// =============================================================================
// This file defines the ONLY surface the rest of the application depends on.
// Today evaluation is performed by a mock scorer running in a Supabase Edge
// Function. Tomorrow it can be a real speech/LLM pipeline: as long as a new
// provider implements `EvaluationProvider`, nothing else in the app changes.
// =============================================================================

import type { Enums } from "@/lib/database.types";

/** The five sub-skills every evaluator must return, plus an overall roll-up. */
export interface ScoreBreakdown {
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  fluency: number;
  communication: number;
  overall: number;
}

export interface EvaluationResult {
  scores: ScoreBreakdown;
  cefrLevel: Enums<"cefr_level">;
  feedback: string;
  strengths: string[];
  improvements: string[];
  evaluator: Enums<"evaluator_type">;
  evaluatorVersion: string;
}

/** Everything a provider might need about a submitted session. */
export interface EvaluationInput {
  sessionId: string;
}

/**
 * A pluggable evaluation backend. Implementations MUST NOT leak provider
 * details (API keys, model names, transport) to callers.
 */
export interface EvaluationProvider {
  readonly id: Enums<"evaluator_type">;
  /** Kick off evaluation for a submitted session. */
  evaluate(input: EvaluationInput): Promise<{ ok: boolean; message?: string }>;
}
