import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, Play, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMyAssignments, type AssignmentWithExam } from "@/features/student/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  assigned: { label: "Not started", variant: "secondary" },
  started: { label: "In progress", variant: "warning" },
  submitted: { label: "Submitted", variant: "default" },
  evaluated: { label: "Completed", variant: "success" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

function ExamCard({ a }: { a: AssignmentWithExam }) {
  const exam = a.exam;
  if (!exam) return null;
  const meta = STATUS_META[a.status] ?? STATUS_META.assigned;
  const canStart = exam.status === "active" && (a.status === "assigned" || a.status === "started");
  const attemptsLeft = exam.max_attempts > 0 ? Math.max(0, exam.max_attempts - a.attempts_used) : null;
  const canRetake = exam.status === "active" && (a.status === "submitted" || a.status === "evaluated") && (attemptsLeft === null || attemptsLeft > 0);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{exam.title}</h3>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          {exam.description && <p className="line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Assigned {formatDistanceToNow(new Date(a.invited_at), { addSuffix: true })}</span>
            {attemptsLeft !== null && <span>{attemptsLeft} attempt(s) left</span>}
            <span>Pass mark {exam.passing_score}%</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {(a.status === "submitted" || a.status === "evaluated") && (
            <Button asChild variant="outline"><Link to={`/results`}><CheckCircle2 className="h-4 w-4" /> View result</Link></Button>
          )}
          {canStart && (
            <Button asChild><Link to={`/exam/${exam.id}/intro`}><Play className="h-4 w-4" /> {a.status === "started" ? "Resume" : "Start"}</Link></Button>
          )}
          {!canStart && canRetake && (
            <Button asChild variant="secondary"><Link to={`/exam/${exam.id}/intro`}><RotateCcw className="h-4 w-4" /> Retake</Link></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentExamsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-assignments", user?.id],
    queryFn: () => getMyAssignments(user!.id),
    enabled: !!user,
  });

  return (
    <div>
      <PageHeader title="My Exams" description="Speaking assessments assigned to you." />
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No exams yet" description="When your instructor assigns you a speaking exam, it will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((a) => <ExamCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
