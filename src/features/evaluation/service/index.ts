import { edgeEvaluationProvider } from "./edgeProvider";
import type { EvaluationProvider } from "./types";

export type { EvaluationProvider, EvaluationResult, ScoreBreakdown } from "./types";

/**
 * The single active evaluation provider for the app. Change this line (or make
 * it configurable per-organization) to switch scoring engines. Everything else
 * imports `evaluationService` and never touches provider internals.
 */
export const evaluationService: EvaluationProvider = edgeEvaluationProvider;

/** Request evaluation for a freshly submitted session. */
export async function requestEvaluation(sessionId: string) {
  return evaluationService.evaluate({ sessionId });
}
