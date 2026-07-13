import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ClipboardList, TrendingUp, Trophy, FileQuestion, ListChecks, ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getOrgStats } from "@/features/dashboard/api";
import { CefrDistribution } from "@/features/dashboard/CefrDistribution";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { displayScore } from "@/lib/utils";

export function OrgAdminDashboard() {
  const { organizationId, profile } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["org-stats", organizationId],
    queryFn: () => getOrgStats(organizationId!),
    enabled: !!organizationId,
  });

  const completionRate =
    data && data.sessions_total > 0 ? Math.round((data.sessions_completed / data.sessions_total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Organization Dashboard"
        description="Track student performance and assessment activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={data?.students ?? 0} icon={GraduationCap} loading={isLoading} />
        <StatCard label="Exams" value={data?.exams ?? 0} icon={ClipboardList} loading={isLoading} />
        <StatCard label="Average score" value={data?.average_score != null ? displayScore(data.average_score) : "—"} icon={TrendingUp} loading={isLoading} accent="success" />
        <StatCard label="Pass rate" value={data?.pass_rate != null ? `${data.pass_rate}%` : "—"} icon={Trophy} loading={isLoading} accent="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">CEFR distribution</CardTitle></CardHeader>
          <CardContent>
            {data ? <CefrDistribution distribution={data.cefr_distribution} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Exam completion</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">of started attempts submitted</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{data?.sessions_completed ?? 0} completed</p>
                <p>{data?.sessions_total ?? 0} total attempts</p>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completionRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/questions", label: "Manage question bank", icon: FileQuestion },
            { to: "/templates", label: "Build an exam template", icon: ListChecks },
            { to: "/exams-admin", label: "Publish & assign exams", icon: ClipboardList },
          ].map((item) => (
            <Card key={item.to} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <Button asChild variant="ghost" size="icon"><Link to={item.to}><ArrowRight className="h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {profile?.organization_id == null && (
          <p className="mt-4 text-sm text-muted-foreground">Your account isn't linked to an organization yet.</p>
        )}
      </div>
    </div>
  );
}
