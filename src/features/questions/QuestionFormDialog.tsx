import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { toast } from "@/components/ui/toaster";
import { createQuestion, updateQuestion, type QuestionWithCategory } from "@/features/questions/api";
import {
  CEFR_LEVELS,
  CEFR_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type McqOption,
} from "@/lib/constants";
import type { Enums, Json, Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const LETTERS = "abcdefgh".split("");

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  question_text: z.string().min(3, "Question text is required"),
  question_type: z.enum(["speaking", "multiple_choice"]),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category_id: z.string().optional(),
  tags: z.string().optional(),
  prep_time_seconds: z.coerce.number().int().min(0).max(600),
  time_limit_seconds: z.coerce.number().int().min(5).max(1200),
  is_active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  organizationId,
  categories,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: QuestionWithCategory | null;
  organizationId: string | null;
  categories: Tables<"categories">[];
  createdBy: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!question;

  const [mcqOptions, setMcqOptions] = React.useState<McqOption[]>([
    { key: "a", text: "" },
    { key: "b", text: "" },
    { key: "c", text: "" },
    { key: "d", text: "" },
  ]);
  const [correctKey, setCorrectKey] = React.useState("a");

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
      question_type: "speaking",
      cefr_level: "B1",
      difficulty: "medium",
      prep_time_seconds: 30,
      time_limit_seconds: 120,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      title: question?.title ?? "",
      description: question?.description ?? "",
      question_text: question?.question_text ?? "",
      question_type: (question?.question_type as Enums<"question_type">) ?? "speaking",
      cefr_level: (question?.cefr_level as Enums<"cefr_level">) ?? "B1",
      difficulty: (question?.difficulty as Enums<"difficulty_level">) ?? "medium",
      category_id: question?.category_id ?? "",
      tags: question?.tags?.join(", ") ?? "",
      prep_time_seconds: question?.prep_time_seconds ?? 30,
      time_limit_seconds: question?.time_limit_seconds ?? (question?.question_type === "multiple_choice" ? 45 : 120),
      is_active: question?.is_active ?? true,
    });
    const opts = (question?.options as McqOption[] | null) ?? null;
    if (opts && opts.length) {
      setMcqOptions(opts);
      setCorrectKey(question?.correct_option_keys?.[0] ?? opts[0].key);
    } else {
      setMcqOptions([
        { key: "a", text: "" },
        { key: "b", text: "" },
        { key: "c", text: "" },
        { key: "d", text: "" },
      ]);
      setCorrectKey("a");
    }
  }, [open, question, reset]);

  const questionType = watch("question_type");
  const isMcq = questionType === "multiple_choice";

  const addOption = () =>
    setMcqOptions((prev) => (prev.length >= 8 ? prev : [...prev, { key: LETTERS[prev.length], text: "" }]));
  const removeOption = (key: string) =>
    setMcqOptions((prev) => {
      const next = prev.filter((o) => o.key !== key).map((o, i) => ({ key: LETTERS[i], text: o.text }));
      if (!next.some((o) => o.key === correctKey)) setCorrectKey(next[0]?.key ?? "a");
      return next;
    });
  const updateOptionText = (key: string, text: string) =>
    setMcqOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let options: Json | null = null;
      let correctKeys: string[] | null = null;
      if (values.question_type === "multiple_choice") {
        const cleaned = mcqOptions.filter((o) => o.text.trim()).map((o) => ({ key: o.key, text: o.text.trim() }));
        if (cleaned.length < 2) throw new Error("Add at least two answer options.");
        if (!cleaned.some((o) => o.key === correctKey)) throw new Error("Mark the correct answer.");
        options = cleaned as unknown as Json;
        correctKeys = [correctKey];
      }
      const payload = {
        title: values.title,
        description: values.description || null,
        question_text: values.question_text,
        question_type: values.question_type,
        cefr_level: values.cefr_level,
        difficulty: values.difficulty,
        category_id: values.category_id || null,
        tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        prep_time_seconds: values.question_type === "speaking" ? values.prep_time_seconds : 0,
        time_limit_seconds: values.time_limit_seconds,
        is_active: values.is_active,
        options,
        correct_option_keys: correctKeys,
      };
      if (isEdit && question) await updateQuestion(question.id, payload);
      else await createQuestion({ ...payload, organization_id: organizationId, created_by: createdBy });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Question updated" : "Question created");
      qc.invalidateQueries({ queryKey: ["questions"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save question"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>Questions in this bank are the only source used to build exams.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Question type</Label>
              <Select value={questionType} onValueChange={(v) => setValue("question_type", v as Enums<"question_type">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-title">Title</Label>
              <Input id="q-title" placeholder="e.g. Present simple agreement" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-text">Question text</Label>
            <Textarea id="q-text" rows={3} placeholder={isMcq ? "The question the candidate will answer" : "The prompt the candidate will answer aloud"} {...register("question_text")} />
            {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
          </div>

          {isMcq && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Answer options</Label>
              {mcqOptions.map((opt) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Mark as the correct answer"
                    onClick={() => setCorrectKey(opt.key)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase transition-colors",
                      correctKey === opt.key ? "border-success bg-success text-success-foreground" : "border-input text-muted-foreground",
                    )}
                  >
                    {opt.key}
                  </button>
                  <Input value={opt.text} onChange={(e) => updateOptionText(opt.key, e.target.value)} placeholder={`Option ${opt.key.toUpperCase()}`} />
                  {mcqOptions.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeOption(opt.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {mcqOptions.length < 8 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}><Plus className="h-4 w-4" /> Add option</Button>
              )}
              <p className="text-xs text-muted-foreground">Click a letter to mark the correct answer (highlighted green).</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="q-desc">Description / rubric notes (optional)</Label>
            <Textarea id="q-desc" rows={2} {...register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>CEFR level</Label>
              <Select value={watch("cefr_level")} onValueChange={(v) => setValue("cefr_level", v as Enums<"cefr_level">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{CEFR_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={watch("difficulty")} onValueChange={(v) => setValue("difficulty", v as Enums<"difficulty_level">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch("category_id") || "none"} onValueChange={(v) => setValue("category_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {!isMcq && (
              <div className="space-y-2">
                <Label htmlFor="q-prep">Prep time (s)</Label>
                <Input id="q-prep" type="number" {...register("prep_time_seconds")} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="q-time">{isMcq ? "Time limit (s)" : "Answer time (s)"}</Label>
              <Input id="q-time" type="number" {...register("time_limit_seconds")} />
              {errors.time_limit_seconds && <p className="text-xs text-destructive">{errors.time_limit_seconds.message}</p>}
            </div>
            <div className={cn("space-y-2", isMcq && "sm:col-span-2")}>
              <Label htmlFor="q-tags">Tags (comma-separated)</Label>
              <Input id="q-tags" placeholder="grammar, vocabulary" {...register("tags")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="q-active">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive questions can't be added to new exams.</p>
            </div>
            <Switch id="q-active" checked={watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null} {isEdit ? "Save changes" : "Create question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
