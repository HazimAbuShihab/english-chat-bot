import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2, PartyPopper, RefreshCw, EyeOff } from "lucide-react";
import { getSessionResult } from "@/features/results/api";
import { requestEvaluation } from "@/features/evaluation/service";
import { EvaluationSummary } from "@/features/results/EvaluationSummary";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";

export default function ExamResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { role } = useAuth();
  const [retrying, setRetrying] = React.useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["session-result", sessionId],
    queryFn: () => getSessionResult(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (q) => {
      const ev = q.state.data?.evaluation;
      // Poll while an evaluation is still being computed.
      return ev && ev.status === "completed" ? false : 4000;
    },
  });

  const rerun = async () => {
    if (!sessionId) return;
    setRetrying(true);
    try {
      const res = await requestEvaluation(sessionId);
      if (!res.ok) throw new Error(res.message ?? "Evaluation failed");
      await refetch();
      toast.success("Evaluation updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not evaluate");
    } finally {
      setRetrying(false);
    }
  };

  if (isLoading) return <FullPageSpinner label="Loading your results…" />;
  if (!data) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-medium">Results not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/results"><ArrowLeft className="h-4 w-4" /> My results</Link></Button>
      </div>
    );
  }

  const { exam, evaluation } = data;
  const backTo = role === "student" ? "/" : "/reports";
  const resultsHidden = exam && !exam.show_results_to_student && role === "student";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to={backTo}><ArrowLeft className="h-4 w-4" /> Back</Link></Button>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{exam?.title ?? "Exam results"}</h1>
            <p className="text-sm text-muted-foreground">Submitted assessment</p>
          </div>
        </div>
        {evaluation?.status === "completed" && (
          <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </Button>
        )}
      </div>

      {resultsHidden ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <EyeOff className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Your exam was submitted successfully.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your instructor has chosen not to release detailed results for this exam. Contact them if you have questions.
            </p>
          </CardContent>
        </Card>
      ) : evaluation && evaluation.status === "completed" ? (
        <EvaluationSummary evaluation={evaluation} passingScore={exam?.passing_score} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-medium">Evaluation in progress…</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> This usually takes a few moments.
              </p>
            </div>
            <Button variant="outline" onClick={() => void rerun()} disabled={retrying}>
              <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Run evaluation now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
