import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Building2, Users, ClipboardList, HardDrive, Mic, GraduationCap, ArrowRight, BarChart3 } from "lucide-react";
import { getPlatformStats } from "@/features/dashboard/api";
import { getOrganizations } from "@/features/organizations/api";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { formatBytes } from "@/lib/utils";

export function SuperAdminDashboard() {
  const statsQ = useQuery({ queryKey: ["platform-stats"], queryFn: getPlatformStats });
  const orgsQ = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
  const stats = statsQ.data;

  return (
    <div>
      <PageHeader title="Platform Dashboard" description="Operational overview across all organizations." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={stats?.organizations ?? 0} icon={Building2} loading={statsQ.isLoading} />
        <StatCard label="Active users" value={stats?.users ?? 0} icon={Users} loading={statsQ.isLoading} hint={`${stats?.students ?? 0} students`} />
        <StatCard label="Exams" value={stats?.exams ?? 0} icon={ClipboardList} loading={statsQ.isLoading} accent="success" />
        <StatCard label="Storage used" value={formatBytes(stats?.storage_bytes)} icon={HardDrive} loading={statsQ.isLoading} accent="warning" hint={`${stats?.audio_files ?? 0} recordings`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sessions" value={stats?.sessions ?? 0} icon={Mic} loading={statsQ.isLoading} />
        <StatCard label="Evaluations" value={stats?.evaluations ?? 0} icon={BarChart3} loading={statsQ.isLoading} />
        <StatCard label="Students" value={stats?.students ?? 0} icon={GraduationCap} loading={statsQ.isLoading} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Organizations</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/organizations">Manage <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardHeader>
        <CardContent>
          {orgsQ.isLoading ? null : !orgsQ.data || orgsQ.data.length === 0 ? (
            <EmptyState icon={Building2} title="No organizations" description="Create the first organization to begin." />
          ) : (
            <div className="divide-y">
              {orgsQ.data.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">Created {format(new Date(o.created_at), "PP")}</p>
                  </div>
                  <Badge variant={o.is_active ? "success" : "secondary"}>{o.plan}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
