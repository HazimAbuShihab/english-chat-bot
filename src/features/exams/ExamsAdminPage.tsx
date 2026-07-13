import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ClipboardList, Users, Copy, UserPlus, Check, FileText } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  listExams,
  createExamFromTemplate,
  assignStudents,
  updateExam,
  type ExamWithMeta,
} from "@/features/exams/api";
import { listTemplates } from "@/features/exams/api";
import { listStudents } from "@/features/students/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { EXAM_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function CreateExamDialog({ orgId, createdBy, open, onOpenChange }: { orgId: string; createdBy: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const templatesQ = useQuery({ queryKey: ["templates", orgId], queryFn: () => listTemplates(orgId), enabled: open });
  const [templateId, setTemplateId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "draft" | "scheduled">("active");

  const publishable = (templatesQ.data ?? []).filter((t) => t.status === "published" && (t.exam_questions?.[0]?.count ?? 0) > 0);
  const selectedTemplate = publishable.find((t) => t.id === templateId);

  React.useEffect(() => {
    if (selectedTemplate && !title) setTitle(selectedTemplate.title);
  }, [selectedTemplate, title]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Choose a template");
      return createExamFromTemplate({ template: selectedTemplate, orgId, createdBy, title: title || selectedTemplate.title, status });
    },
    onSuccess: (data) => {
      toast.success(`Exam published — join code ${data.join_code}`);
      qc.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
      setTemplateId(""); setTitle("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not publish exam"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish an exam</DialogTitle>
          <DialogDescription>Create a live exam from one of your published templates.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
              <SelectContent>
                {publishable.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">No published templates with questions.</div>
                ) : (
                  publishable.map((t) => <SelectItem key={t.id} value={t.id}>{t.title} · {t.exam_questions?.[0]?.count} Q</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-title">Exam title</Label>
            <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Placement — Spring 2026" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (students can take it now)</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !templateId}>
            {mutation.isPending ? <Spinner /> : null} Publish exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ exam, orgId, assignedBy, open, onOpenChange }: { exam: ExamWithMeta; orgId: string; assignedBy: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const studentsQ = useQuery({ queryKey: ["students", orgId], queryFn: () => listStudents(orgId), enabled: open });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const mutation = useMutation({
    mutationFn: () => assignStudents({ examId: exam.id, orgId, studentIds: Array.from(selected), assignedBy }),
    onSuccess: () => {
      toast.success("Students assigned");
      qc.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
      setSelected(new Set());
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign students</DialogTitle>
          <DialogDescription>Select students to assign to “{exam.title}”.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2 scrollbar-thin">
          {studentsQ.isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading students…</p>
          ) : (studentsQ.data ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No students yet. Invite students first.</p>
          ) : (
            studentsQ.data!.map((s) => {
              const on = selected.has(s.id);
              return (
                <button type="button" key={s.id} onClick={() => toggle(s.id)} className={cn("flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors", on ? "bg-primary/5" : "hover:bg-accent")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.full_name ?? "Unnamed"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || selected.size === 0}>
            {mutation.isPending ? <Spinner /> : <UserPlus className="h-4 w-4" />} Assign {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExamsAdminPage() {
  const { organizationId, user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [assignExam, setAssignExam] = React.useState<ExamWithMeta | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exams", organizationId],
    queryFn: () => listExams(organizationId!),
    enabled: !!organizationId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExamWithMeta["status"] }) => updateExam(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update"),
  });

  const copyCode = (code: string | null) => {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast.success(`Copied join code ${code}`);
  };

  if (!organizationId) return <EmptyState icon={ClipboardList} title="No organization" description="Your account isn't linked to an organization." />;

  return (
    <div>
      <PageHeader
        title="Exams"
        description="Publish exams from templates, assign students, and share join codes."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Publish exam</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No exams published" description="Publish an exam from a template to assign it to students." action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Publish exam</Button>} />
      ) : (
        <div className="space-y-3">
          {data.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{exam.title}</h3>
                    <Badge variant={exam.status === "active" ? "success" : "secondary"}>{EXAM_STATUS_LABELS[exam.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {exam.exam_assignments?.[0]?.count ?? 0} assigned</span>
                    {exam.template && <span>From: {exam.template.title}</span>}
                    <span>Created {format(new Date(exam.created_at), "PP")}</span>
                    {exam.join_code && (
                      <button onClick={() => copyCode(exam.join_code)} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono font-medium text-foreground transition-colors hover:bg-accent">
                        {exam.join_code} <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAssignExam(exam)}><UserPlus className="h-4 w-4" /> Assign</Button>
                  <Button asChild variant="ghost" size="sm"><Link to={`/reports?exam=${exam.id}`}><FileText className="h-4 w-4" /> Results</Link></Button>
                  <Select value={exam.status} onValueChange={(v) => statusMutation.mutate({ id: exam.id, status: v as ExamWithMeta["status"] })}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["draft", "scheduled", "active", "closed", "archived"] as const).map((s) => (
                        <SelectItem key={s} value={s}>{EXAM_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user && <CreateExamDialog orgId={organizationId} createdBy={user.id} open={createOpen} onOpenChange={setCreateOpen} />}
      {user && assignExam && (
        <AssignDialog exam={assignExam} orgId={organizationId} assignedBy={user.id} open={!!assignExam} onOpenChange={(o) => !o && setAssignExam(null)} />
      )}
    </div>
  );
}
