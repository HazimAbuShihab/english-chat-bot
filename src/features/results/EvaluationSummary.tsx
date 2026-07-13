import { Sparkles, TrendingUp, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { ScoreBar, ScoreRing } from "@/components/common/ScoreBar";
import { SCORE_DIMENSIONS, CEFR_LABELS } from "@/lib/constants";
import type { Tables } from "@/lib/database.types";

/** Presentation of a completed evaluation. Shared by student results & reports. */
export function EvaluationSummary({
  evaluation,
  passingScore,
}: {
  evaluation: Tables<"evaluations">;
  passingScore?: number;
}) {
  const overall = evaluation.overall_score ?? 0;
  const passed = passingScore != null ? overall >= passingScore : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto,1fr] sm:items-center">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing value={overall} />
            <div className="flex items-center gap-2">
              <CefrBadge level={evaluation.cefr_level} />
              {passed !== undefined && (
                <Badge variant={passed ? "success" : "destructive"}>{passed ? "Passed" : "Not passed"}</Badge>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated level</p>
              <p className="text-lg font-semibold">
                {evaluation.cefr_level ? CEFR_LABELS[evaluation.cefr_level] : "Pending"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SCORE_DIMENSIONS.map((dim) => (
                <ScoreBar key={dim.key} label={dim.label} value={evaluation[dim.key] as number | null} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {evaluation.feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4 text-primary" /> Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.feedback}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-success" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-success">•</span> {s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {evaluation.improvements && evaluation.improvements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-warning" /> Areas to improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {evaluation.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-warning">•</span> {s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Evaluated by <span className="font-medium">{evaluation.evaluator}</span>
        {evaluation.evaluator_version ? ` (${evaluation.evaluator_version})` : ""}. This scoring engine is designed to be
        replaced by an AI evaluation service without changing the rest of the platform.
      </p>
    </div>
  );
}
