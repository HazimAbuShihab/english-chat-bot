import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, GraduationCap, TrendingUp, Play, ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMyAssignments, getMySessions } from "@/features/student/api";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { displayScore } from "@/lib/utils";

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const assignmentsQ = useQuery({ queryKey: ["my-assignments", user?.id], queryFn: () => getMyAssignments(user!.id), enabled: !!user });
  const sessionsQ = useQuery({ queryKey: ["my-sessions", user?.id], queryFn: () => getMySessions(user!.id), enabled: !!user });

  const assignments = assignmentsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const loading = assignmentsQ.isLoading || sessionsQ.isLoading;

  const todo = assignments.filter((a) => a.exam?.status === "active" && (a.status === "assigned" || a.status === "started"));
  const completedEvals = sessions.filter((s) => s.evaluation?.status === "completed" && s.evaluation.overall_score != null);
  const avg =
    completedEvals.length > 0
      ? completedEvals.reduce((sum, s) => sum + (s.evaluation!.overall_score ?? 0), 0) / completedEvals.length
      : null;
  const latestCefr = completedEvals[0]?.evaluation?.cefr_level ?? null;

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div>
      <PageHeader title={`Welcome back, ${firstName}`} description="Here's a snapshot of your speaking assessments." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Exams to take" value={todo.length} icon={ClipboardList} loading={loading} accent="warning" />
        <StatCard label="Completed" value={completedEvals.length} icon={CheckCircle2} loading={loading} accent="success" />
        <StatCard label="Average score" value={avg != null ? displayScore(avg) : "—"} icon={TrendingUp} loading={loading} />
        <StatCard label="Latest CEFR" value={latestCefr ?? "—"} icon={GraduationCap} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">To do</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/exams">View all <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? null : todo.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All caught up" description="You have no pending exams right now." />
            ) : (
              todo.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.exam?.title}</p>
                    <p className="text-xs text-muted-foreground">Pass mark {a.exam?.passing_score}%</p>
                  </div>
                  <Button asChild size="sm"><Link to={`/exam/${a.exam?.id}/intro`}><Play className="h-4 w-4" /> {a.status === "started" ? "Resume" : "Start"}</Link></Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent results</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/results">View all <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? null : completedEvals.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No results yet" description="Your scored assessments will show up here." />
            ) : (
              completedEvals.slice(0, 4).map((s) => (
                <Link key={s.id} to={`/session/${s.id}/result`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.exam?.title}</p>
                    <div className="mt-0.5"><CefrBadge level={s.evaluation?.cefr_level} /></div>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">{displayScore(s.evaluation?.overall_score)}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
