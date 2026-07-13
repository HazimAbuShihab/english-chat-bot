import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileQuestion, Pencil, Trash2, Clock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { listQuestions, listCategories, softDeleteQuestion, type QuestionWithCategory, type QuestionFilters } from "@/features/questions/api";
import { QuestionFormDialog } from "@/features/questions/QuestionFormDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { CefrBadge } from "@/components/common/CefrBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DIFFICULTY_LABELS, CEFR_LEVELS, DIFFICULTY_LEVELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import type { Enums } from "@/lib/database.types";

export default function QuestionsPage() {
  const { organizationId, user, role } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = React.useState<QuestionFilters>({ cefr: "all", difficulty: "all", categoryId: "all" });
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<QuestionWithCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuestionWithCategory | null>(null);

  // Debounce search into filters.
  React.useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const questionsQ = useQuery({ queryKey: ["questions", filters], queryFn: () => listQuestions(filters) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteQuestion(id),
    onSuccess: () => {
      toast.success("Question archived");
      qc.invalidateQueries({ queryKey: ["questions"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete"),
  });

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (q: QuestionWithCategory) => { setEditing(q); setDialogOpen(true); };

  // Super admin manages the global bank (organization_id = null); org admins their own.
  const bankOrgId = role === "super_admin" ? null : organizationId;

  return (
    <div>
      <PageHeader
        title={role === "super_admin" ? "Global Question Bank" : "Question Bank"}
        description="The single source of speaking prompts. Exams draw questions only from here."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New question</Button>}
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filters.cefr} onValueChange={(v) => setFilters((f) => ({ ...f, cefr: v as Enums<"cefr_level"> | "all" }))}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="CEFR" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.difficulty} onValueChange={(v) => setFilters((f) => ({ ...f, difficulty: v as Enums<"difficulty_level"> | "all" }))}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulty</SelectItem>
              {DIFFICULTY_LEVELS.map((d) => <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.categoryId} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categoriesQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {questionsQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !questionsQ.data || questionsQ.data.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No questions found" description="Adjust your filters or create your first question." action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New question</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="hidden sm:table-cell">Difficulty</TableHead>
                <TableHead className="hidden lg:table-cell">Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionsQ.data.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-xs">
                    <p className="font-medium">{q.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{q.question_text}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {q.category ? <Badge variant="secondary">{q.category.name}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><CefrBadge level={q.cefr_level} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{DIFFICULTY_LABELS[q.difficulty]}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(q.time_limit_seconds)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.is_active ? "success" : "secondary"}>{q.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(q)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {user && (
        <QuestionFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          question={editing}
          organizationId={bankOrgId}
          categories={categoriesQ.data ?? []}
          createdBy={user.id}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive question?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.title}" will be archived and removed from new exams. Existing results are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
