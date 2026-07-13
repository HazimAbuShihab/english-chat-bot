import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CEFR_LEVELS, CEFR_LABELS, DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from "@/lib/constants";
import type { Enums, Tables } from "@/lib/database.types";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  question_text: z.string().min(5, "Question text is required"),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category_id: z.string().optional(),
  tags: z.string().optional(),
  prep_time_seconds: z.coerce.number().int().min(0).max(600),
  time_limit_seconds: z.coerce.number().int().min(10).max(1200),
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cefr_level: "B1",
      difficulty: "medium",
      prep_time_seconds: 30,
      time_limit_seconds: 120,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: question?.title ?? "",
        description: question?.description ?? "",
        question_text: question?.question_text ?? "",
        cefr_level: (question?.cefr_level as Enums<"cefr_level">) ?? "B1",
        difficulty: (question?.difficulty as Enums<"difficulty_level">) ?? "medium",
        category_id: question?.category_id ?? "",
        tags: question?.tags?.join(", ") ?? "",
        prep_time_seconds: question?.prep_time_seconds ?? 30,
        time_limit_seconds: question?.time_limit_seconds ?? 120,
        is_active: question?.is_active ?? true,
      });
    }
  }, [open, question, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        question_text: values.question_text,
        cefr_level: values.cefr_level,
        difficulty: values.difficulty,
        category_id: values.category_id || null,
        tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        prep_time_seconds: values.prep_time_seconds,
        time_limit_seconds: values.time_limit_seconds,
        is_active: values.is_active,
      };
      if (isEdit && question) {
        await updateQuestion(question.id, payload);
      } else {
        await createQuestion({ ...payload, organization_id: organizationId, created_by: createdBy });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Question updated" : "Question created");
      qc.invalidateQueries({ queryKey: ["questions"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save question"),
  });

  const cefr = watch("cefr_level");
  const difficulty = watch("difficulty");
  const categoryId = watch("category_id");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            Questions in this bank are the only source used to build speaking exams.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-title">Title</Label>
            <Input id="q-title" placeholder="e.g. Describe your daily routine" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-text">Question text</Label>
            <Textarea id="q-text" rows={3} placeholder="The prompt the candidate will answer aloud" {...register("question_text")} />
            {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-desc">Description / rubric notes (optional)</Label>
            <Textarea id="q-desc" rows={2} {...register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>CEFR level</Label>
              <Select value={cefr} onValueChange={(v) => setValue("cefr_level", v as Enums<"cefr_level">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{CEFR_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setValue("difficulty", v as Enums<"difficulty_level">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setValue("category_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="q-prep">Prep time (s)</Label>
              <Input id="q-prep" type="number" {...register("prep_time_seconds")} />
              {errors.prep_time_seconds && <p className="text-xs text-destructive">{errors.prep_time_seconds.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-time">Answer time (s)</Label>
              <Input id="q-time" type="number" {...register("time_limit_seconds")} />
              {errors.time_limit_seconds && <p className="text-xs text-destructive">{errors.time_limit_seconds.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-tags">Tags (comma-separated)</Label>
              <Input id="q-tags" placeholder="opinion, work" {...register("tags")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="q-active">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive questions can't be added to new exams.</p>
            </div>
            <Switch id="q-active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null} {isEdit ? "Save changes" : "Create question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
