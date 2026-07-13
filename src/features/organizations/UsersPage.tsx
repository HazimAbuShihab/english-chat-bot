import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { getAllUsers } from "@/features/organizations/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, type RoleKey } from "@/lib/constants";
import { initials } from "@/lib/utils";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  super_admin: "default",
  org_admin: "success",
  student: "secondary",
};

export default function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["all-users"], queryFn: getAllUsers });

  return (
    <div>
      <PageHeader title="Users" description="All accounts across every organization." />
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Users} title="No users" description="Users will appear here as they join." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{initials(u.full_name ?? u.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.full_name ?? "Unnamed"}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.organization?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>{ROLE_LABELS[u.role as RoleKey] ?? u.role}</Badge></TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "success" : "secondary"}>{u.status}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(u.created_at), "PP")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
