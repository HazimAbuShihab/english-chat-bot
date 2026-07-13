import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { toast } from "@/components/ui/toaster";
import { listQuestions } from "@/features/questions/api";
import {
  createTemplate,
  updateTemplate,
  setTemplateQuestions,
  getTemplateQuestions,
} from "@/features/exams/api";
import { RETAKE_POLICIES, RETAKE_LABELS } from "@/lib/constants";
import type { Enums, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  passing_score: z.coerce.number().min(0).max(100),
  total_minutes: z.coerce.number().min(0).max(240),
  randomize_questions: z.boolean(),
  question_count: z.coerce.number().min(0).max(100),
  retake_policy: z.enum(["none", "limited", "unlimited"]),
  max_attempts: z.coerce.number().min(1).max(20),
  show_results_to_student: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});
type FormValues = z.infer<typeof schema>;

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  orgId,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Tables<"exam_templates"> | null;
  orgId: string;
  createdBy: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!template;
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bankSearch, setBankSearch] = React.useState("");

  const bankQ = useQuery({ queryKey: ["questions", { activeOnly: true }], queryFn: () => listQuestions({ activeOnly: true }) });
  const existingQ = useQuery({
    queryKey: ["template-questions", template?.id],
    queryFn: () => getTemplateQuestions(template!.id),
    enabled: open && !!template,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      passing_score: 60,
      total_minutes: 15,
      randomize_questions: false,
      question_count: 0,
      retake_policy: "none",
      max_attempts: 1,
      show_results_to_student: true,
      status: "published",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: template?.title ?? "",
        description: template?.description ?? "",
        instructions: template?.instructions ?? "",
        passing_score: template?.passing_score ?? 60,
        total_minutes: template?.total_time_limit_seconds ? Math.round(template.total_time_limit_seconds / 60) : 15,
        randomize_questions: template?.randomize_questions ?? false,
        question_count: template?.question_count ?? 0,
        retake_policy: (template?.retake_policy as Enums<"retake_policy">) ?? "none",
        max_attempts: template?.max_attempts ?? 1,
        show_results_to_student: template?.show_results_to_student ?? true,
        status: (template?.status as Enums<"template_status">) ?? "published",
      });
      if (!template) setSelected([]);
    }
  }, [open, template, reset]);

  React.useEffect(() => {
    if (existingQ.data) setSelected(existingQ.data.map((tq) => tq.question_id));
  }, [existingQ.data]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        instructions: values.instructions || null,
        passing_score: values.passing_score,
        total_time_limit_seconds: values.total_minutes > 0 ? values.total_minutes * 60 : null,
        randomize_questions: values.randomize_questions,
        question_count: values.question_count > 0 ? values.question_count : null,
        retake_policy: values.retake_policy,
        max_attempts: values.max_attempts,
        show_results_to_student: values.show_results_to_student,
        status: values.status,
      };
      let templateId = template?.id;
      if (isEdit && template) {
        await updateTemplate(template.id, payload);
      } else {
        const created = await createTemplate({ ...payload, organization_id: orgId, created_by: createdBy });
        templateId = created.id;
      }
      if (templateId) await setTemplateQuestions(templateId, selected);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template-questions"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save template"),
  });

  const onSubmit = (values: FormValues) => {
    if (selected.length === 0) {
      toast.error("Add at least one question to the template.");
      return;
    }
    mutation.mutate(values);
  };

  const bank = (bankQ.data ?? []).filter((q) =>
    bankSearch ? q.title.toLowerCase().includes(bankSearch.toLowerCase()) : true,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit template" : "New exam template"}</DialogTitle>
          <DialogDescription>Define the rules and select questions from your bank.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-desc">Description</Label>
              <Input id="t-desc" {...register("description")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-inst">Instructions for candidates</Label>
              <Textarea id="t-inst" rows={2} {...register("instructions")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="t-pass">Passing score (%)</Label>
              <Input id="t-pass" type="number" {...register("passing_score")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-time">Total time (min)</Label>
              <Input id="t-time" type="number" {...register("total_minutes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-count">Questions to serve</Label>
              <Input id="t-count" type="number" placeholder="0 = all" {...register("question_count")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Retake policy</Label>
              <Select value={watch("retake_policy")} onValueChange={(v) => setValue("retake_policy", v as Enums<"retake_policy">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETAKE_POLICIES.map((p) => <SelectItem key={p} value={p}>{RETAKE_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-att">Max attempts</Label>
              <Input id="t-att" type="number" {...register("max_attempts")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as Enums<"template_status">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={watch("randomize_questions")} onCheckedChange={(v) => setValue("randomize_questions", v)} />
              Randomize question order
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={watch("show_results_to_student")} onCheckedChange={(v) => setValue("show_results_to_student", v)} />
              Show results to students
            </label>
          </div>

          {/* Question selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Questions <Badge variant="secondary" className="ml-1">{selected.length} selected</Badge></Label>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-8 text-xs" placeholder="Search bank…" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} />
              </div>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2 scrollbar-thin">
              {bankQ.isLoading ? (
                <p className="p-3 text-sm text-muted-foreground">Loading question bank…</p>
              ) : bank.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No questions match. Add questions to the bank first.</p>
              ) : (
                bank.map((q) => {
                  const idx = selected.indexOf(q.id);
                  const isSel = idx >= 0;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => toggle(q.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors",
                        isSel ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent",
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", isSel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        {isSel ? idx + 1 : <GripVertical className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{q.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{q.question_text}</span>
                      </span>
                      <CefrBadge level={q.cefr_level} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null} {isEdit ? "Save template" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
