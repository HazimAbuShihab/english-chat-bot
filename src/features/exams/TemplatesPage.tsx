import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ListChecks, Pencil, Trash2, Clock, Percent } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { listTemplates, softDeleteTemplate, type TemplateWithCount } from "@/features/exams/api";
import { TemplateFormDialog } from "@/features/exams/TemplateFormDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  published: "success",
  archived: "secondary",
};

export default function TemplatesPage() {
  const { organizationId, user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TemplateWithCount | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates", organizationId],
    queryFn: () => listTemplates(organizationId!),
    enabled: !!organizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteTemplate(id),
    onSuccess: () => {
      toast.success("Template archived");
      qc.invalidateQueries({ queryKey: ["templates"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not archive"),
  });

  if (!organizationId) {
    return <EmptyState icon={ListChecks} title="No organization" description="Your account isn't linked to an organization." />;
  }

  return (
    <div>
      <PageHeader
        title="Exam Templates"
        description="Reusable blueprints that define questions, timing and rules."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> New template</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ListChecks} title="No templates yet" description="Create a template to define which questions an exam uses." action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> New template</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{t.title}</h3>
                    {t.description && <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {t.exam_questions?.[0]?.count ?? 0} questions</span>
                  <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> Pass {t.passing_score}%</span>
                  {t.total_time_limit_seconds && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(t.total_time_limit_seconds / 60)} min</span>}
                  <span>Updated {format(new Date(t.updated_at), "PP")}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(t); setDialogOpen(true); }}><Pencil className="h-4 w-4" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(t)}><Trash2 className="h-4 w-4" /> Archive</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user && (
        <TemplateFormDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} orgId={organizationId} createdBy={user.id} />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive template?</DialogTitle>
            <DialogDescription>"{deleteTarget?.title}" will be archived. Exams already created from it are unaffected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
