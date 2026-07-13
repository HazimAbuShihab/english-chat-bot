import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMySessions } from "@/features/student/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { displayScore } from "@/lib/utils";
import { SESSION_STATUS_LABELS } from "@/lib/constants";

export default function StudentResultsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-sessions", user?.id],
    queryFn: () => getMySessions(user!.id),
    enabled: !!user,
  });

  return (
    <div>
      <PageHeader title="My Results" description="Your completed and in-progress assessments." />
      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={BarChart3} title="No results yet" description="Complete an assigned exam to see your scores and CEFR level here." />
      ) : (
        <div className="space-y-3">
          {data.map((r) => {
            const done = r.evaluation?.status === "completed";
            const hidden = r.exam && !r.exam.show_results_to_student;
            return (
              <Link key={r.id} to={`/session/${r.id}/result`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold">{r.exam?.title ?? "Exam"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.submitted_at ? `Submitted ${format(new Date(r.submitted_at), "PP")}` : `Started ${format(new Date(r.created_at), "PP")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {done && !hidden ? (
                        <>
                          <div className="text-right">
                            <p className="text-lg font-bold tabular-nums">{displayScore(r.evaluation?.overall_score)}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">Overall</p>
                          </div>
                          <CefrBadge level={r.evaluation?.cefr_level} />
                        </>
                      ) : (
                        <Badge variant="secondary">{SESSION_STATUS_LABELS[r.status]}</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
