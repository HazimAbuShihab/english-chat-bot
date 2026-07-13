import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { listOrgSessions } from "@/features/reports/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { displayScore, initials } from "@/lib/utils";
import { SESSION_STATUS_LABELS } from "@/lib/constants";

export default function ReportsPage() {
  const { organizationId } = useAuth();
  const [params] = useSearchParams();
  const examId = params.get("exam");

  const { data, isLoading } = useQuery({
    queryKey: ["org-sessions", organizationId, examId],
    queryFn: () => listOrgSessions(organizationId!, examId),
    enabled: !!organizationId,
  });

  return (
    <div>
      <PageHeader title="Results & Reports" description="Every attempt across your organization with its evaluation." />

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={FileText} title="No results yet" description="Once students submit exams, their results and reports appear here." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Exam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>CEFR</TableHead>
                <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const done = r.evaluation?.status === "completed";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback>{initials(r.student?.full_name ?? r.student?.email)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.student?.full_name ?? "Unnamed"}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.student?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{r.exam?.title ?? "—"}</TableCell>
                    <TableCell><Badge variant={done ? "success" : "secondary"}>{SESSION_STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="tabular-nums font-medium">{done ? displayScore(r.evaluation?.overall_score) : "—"}</TableCell>
                    <TableCell><CefrBadge level={r.evaluation?.cefr_level} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.submitted_at ? format(new Date(r.submitted_at), "PP") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/reports/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        View <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
