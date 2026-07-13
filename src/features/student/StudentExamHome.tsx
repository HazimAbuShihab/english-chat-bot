import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Play, RotateCcw, Clock, ShieldCheck, Mic, ArrowRight, CalendarClock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getActiveAssignment } from "@/features/student/api";
import { PageHeader } from "@/components/common/PageHeader";
import { FullPageSpinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

/** The student's home: their single active exam, ready to start or resume. */
export function StudentExamHome() {
  const { user, profile } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["active-assignment", user?.id],
    queryFn: () => getActiveAssignment(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <FullPageSpinner label="Loading your exam…" />;

  const exam = data?.exam;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";
  const inProgress = data?.status === "started";
  const settings = (exam?.settings ?? {}) as Record<string, unknown> | undefined;
  const totalSeconds = Number(settings?.total_time_limit_seconds ?? 0);

  return (
    <div>
      <PageHeader title={`Welcome, ${firstName}`} description="Here is the exam assigned to you." />

      {!exam ? (
        // The gate normally prevents this, but render a graceful fallback.
        <Card><CardContent className="py-12 text-center text-muted-foreground">You have no active exam right now.</CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-primary/5 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={inProgress ? "warning" : "success"}>{inProgress ? "In progress" : "Ready to start"}</Badge>
              <span className="text-xs text-muted-foreground">Single attempt</span>
              {exam.available_until && (
                <span className="flex items-center gap-1 text-xs font-medium text-warning">
                  <CalendarClock className="h-3.5 w-3.5" /> Closes {formatDistanceToNow(new Date(exam.available_until), { addSuffix: true })}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-bold">{exam.title}</h2>
            {exam.description && <p className="mt-1 text-sm text-muted-foreground">{exam.description}</p>}
          </div>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Clock className="h-5 w-5 text-primary" />
                <div><p className="text-xs text-muted-foreground">Time limit</p><p className="text-sm font-semibold">{totalSeconds ? formatDuration(totalSeconds) : "Per question"}</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div><p className="text-xs text-muted-foreground">Passing score</p><p className="text-sm font-semibold">{exam.passing_score}%</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Mic className="h-5 w-5 text-primary" />
                <div><p className="text-xs text-muted-foreground">Format</p><p className="text-sm font-semibold">Spoken answers</p></div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                You'll test your microphone, then answer each question aloud. This exam can only be taken once.
              </p>
              <Button asChild size="lg">
                <Link to={`/exam/${exam.id}/intro`}>
                  {inProgress ? <><RotateCcw className="h-4 w-4" /> Resume exam</> : <><Play className="h-4 w-4" /> Start exam</>}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
