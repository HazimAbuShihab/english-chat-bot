import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  SkipForward,
  Square,
  Send,
  ListChecks,
} from "lucide-react";
import {
  getSessionDetail,
  saveSessionProgress,
  saveMcqAnswer,
  skipAnswer,
  submitExamSession,
  uploadAnswerAudio,
  type SessionQuestion,
} from "@/features/exam-session/api";
import { requestEvaluation } from "@/features/evaluation/service";
import { useRecorder } from "@/features/exam-session/useRecorder";
import { MicLevelMeter } from "@/features/exam-session/components/MicLevelMeter";
import { CefrBadge } from "@/components/common/CefrBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner, FullPageSpinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn, formatDuration } from "@/lib/utils";

type Phase = "loading" | "prep" | "recording" | "uploading" | "recorded" | "error" | "mcq";

export default function ExamRunnerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rec = useRecorder();

  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [prepLeft, setPrepLeft] = React.useState(0);
  const [recLeft, setRecLeft] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [answeredIds, setAnsweredIds] = React.useState<Set<string>>(new Set());
  const [mcqSelection, setMcqSelection] = React.useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const stoppingRef = React.useRef(false);
  const initedRef = React.useRef(false);
  const micRequestedRef = React.useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: () => getSessionDetail(sessionId!),
    enabled: !!sessionId,
    refetchOnMount: "always",
  });

  const questions = data?.questions ?? [];
  const current: SessionQuestion | undefined = questions[index];
  const needsMic = questions.some((q) => q.question_type === "speaking");
  const micReady = !needsMic || rec.permission === "granted";

  const initQuestion = React.useCallback((q: SessionQuestion) => {
    stoppingRef.current = false;
    setUploadError(null);
    if (q.question_type === "multiple_choice") {
      setMcqSelection(q.answer?.selected_options ?? []);
      setPhase("mcq");
      return;
    }
    if (q.answer && (q.answer.status === "uploaded" || q.answer.status === "skipped")) {
      setPhase("recorded");
    } else {
      setPhase("prep");
      setPrepLeft(q.prep_time_seconds);
    }
  }, []);

  // Request the microphone only if the exam contains a spoken question.
  React.useEffect(() => {
    if (!data || micRequestedRef.current) return;
    if (data.questions.some((q) => q.question_type === "speaking")) {
      micRequestedRef.current = true;
      void rec.requestPermission();
    }
    return () => rec.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Initialize once data + (mic when needed) are ready, honoring resume index.
  React.useEffect(() => {
    if (initedRef.current) return;
    if (!data || !micReady) return;
    initedRef.current = true;
    const answered = new Set(
      data.questions.filter((q) => q.answer && q.answer.status !== "pending").map((q) => q.id),
    );
    setAnsweredIds(answered);
    const startIndex = Math.min(Math.max(0, data.session.current_index ?? 0), data.questions.length - 1);
    setIndex(startIndex);
    initQuestion(data.questions[startIndex]);
  }, [data, micReady, initQuestion]);

  const startRecording = React.useCallback(() => {
    if (!current) return;
    rec.start();
    setPhase("recording");
    setRecLeft(current.time_limit_seconds);
  }, [current, rec]);

  const stopAndUpload = React.useCallback(async () => {
    if (stoppingRef.current || !current || !data) return;
    stoppingRef.current = true;
    setPhase("uploading");
    try {
      const result = await rec.stop();
      if (!result) throw new Error("No recording captured");
      await uploadAnswerAudio({
        sessionId: data.session.id,
        questionId: current.id,
        organizationId: data.session.organization_id,
        studentId: data.session.student_id,
        position: current.position,
        blob: result.blob,
        extension: result.extension,
        mimeType: result.mimeType,
        durationSeconds: result.durationSeconds,
      });
      setAnsweredIds((prev) => new Set(prev).add(current.id));
      setPhase("recorded");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    } finally {
      stoppingRef.current = false;
    }
  }, [current, data, rec]);

  // Preparation countdown (speaking only).
  React.useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) { startRecording(); return; }
    const t = window.setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, prepLeft, startRecording]);

  // Recording countdown (speaking only).
  React.useEffect(() => {
    if (phase !== "recording") return;
    if (recLeft <= 0) { void stopAndUpload(); return; }
    const t = window.setTimeout(() => setRecLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, recLeft, stopAndUpload]);

  const goNext = React.useCallback(async () => {
    if (!data || !current) return;
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) { setConfirmOpen(true); return; }
    await saveSessionProgress(data.session.id, nextIndex).catch(() => undefined);
    setIndex(nextIndex);
    initQuestion(questions[nextIndex]);
  }, [data, current, index, questions, initQuestion]);

  // Save the current answer (MCQ) then advance; speaking answers are already saved.
  const advance = React.useCallback(async () => {
    if (!data || !current) return;
    if (current.question_type === "multiple_choice") {
      if (mcqSelection.length === 0) { toast.error("Choose an answer, or skip this question."); return; }
      try {
        await saveMcqAnswer({
          sessionId: data.session.id,
          questionId: current.id,
          organizationId: data.session.organization_id,
          position: current.position,
          selectedKeys: mcqSelection,
        });
        setAnsweredIds((prev) => new Set(prev).add(current.id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save answer");
        return;
      }
    }
    await goNext();
  }, [data, current, mcqSelection, goNext]);

  const skipCurrent = React.useCallback(async () => {
    if (!data || !current) return;
    try {
      if (rec.status === "recording") await rec.stop();
      await skipAnswer({
        sessionId: data.session.id,
        questionId: current.id,
        organizationId: data.session.organization_id,
        position: current.position,
      });
      setAnsweredIds((prev) => new Set(prev).add(current.id));
      await goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not skip question");
    }
  }, [data, current, rec, goNext]);

  const submit = React.useCallback(async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await submitExamSession(sessionId);
      const res = await requestEvaluation(sessionId);
      if (!res.ok) console.warn("Evaluation deferred:", res.message);
      qc.invalidateQueries({ queryKey: ["active-assignment"] });
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
      rec.dispose();
      navigate(`/session/${sessionId}/result`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit exam");
      setSubmitting(false);
    }
  }, [sessionId, rec, navigate, qc]);

  if (isLoading) return <FullPageSpinner label="Preparing your exam…" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <p className="mt-3 font-medium">We couldn't load this session.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Back</Button>
      </div>
    );
  }

  // Microphone gating only applies to exams that contain a spoken question.
  if (needsMic) {
    if (!rec.supported) {
      return (
        <div className="mx-auto max-w-md py-20 text-center">
          <MicOff className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-medium">Recording isn't supported in this browser.</p>
          <p className="text-sm text-muted-foreground">Please use a recent version of Chrome, Edge, or Firefox.</p>
        </div>
      );
    }
    if (rec.permission === "denied") {
      return (
        <div className="mx-auto max-w-md py-20 text-center">
          <MicOff className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-medium">Microphone access is required.</p>
          <p className="text-sm text-muted-foreground">{rec.error}</p>
          <Button className="mt-4" onClick={() => void rec.requestPermission()}><Mic className="h-4 w-4" /> Try again</Button>
        </div>
      );
    }
    if (rec.permission !== "granted") return <FullPageSpinner label="Connecting microphone…" />;
  }

  if (!current) return <FullPageSpinner label="Preparing your exam…" />;

  const total = questions.length;
  const answeredCount = answeredIds.size;
  const progressPct = Math.round((index / total) * 100);
  const isLast = index === total - 1;
  const isMcq = current.question_type === "multiple_choice";
  const busy = phase === "prep" || phase === "recording" || phase === "uploading";
  const advanceDisabled = submitting || (isMcq ? mcqSelection.length === 0 : busy);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Question {index + 1} of {total}</span>
          <span className="text-muted-foreground">{answeredCount} answered</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <Card>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{current.title}</Badge>
            <Badge variant="outline" className="gap-1">
              {isMcq ? <><ListChecks className="h-3 w-3" /> Multiple choice</> : <><Mic className="h-3 w-3" /> Speaking</>}
            </Badge>
            <CefrBadge level={current.cefr_level} />
            {answeredIds.has(current.id) && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Answered</Badge>}
          </div>

          <div>
            <p className="text-lg font-medium leading-relaxed sm:text-xl">{current.question_text}</p>
            {current.description && <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>}
          </div>

          {current.audio_url && !isMcq && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1 text-xs text-muted-foreground">Listen to the prompt:</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={current.audio_url} controls className="w-full" />
            </div>
          )}

          {/* Multiple-choice options */}
          {isMcq ? (
            <div className="space-y-2">
              {current.options.map((opt) => {
                const selected = mcqSelection.includes(opt.key);
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setMcqSelection([opt.key])}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selected ? "border-primary bg-primary/5" : "hover:bg-accent",
                    )}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase", selected ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground")}>
                      {opt.key}
                    </span>
                    <span className="text-sm">{opt.text}</span>
                    {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-5">
              {phase === "prep" && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-sm text-muted-foreground">Get ready — recording starts automatically.</p>
                  <div className="text-4xl font-bold tabular-nums text-primary">{prepLeft}s</div>
                  <p className="text-xs text-muted-foreground">Preparation time</p>
                  <Button onClick={startRecording}><Mic className="h-4 w-4" /> Start recording now</Button>
                </div>
              )}
              {phase === "recording" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-destructive" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                    </span>
                    <span className="text-sm font-medium text-destructive">Recording</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{formatDuration(recLeft)} left</span>
                  </div>
                  <MicLevelMeter level={rec.level} active />
                  <Button variant="destructive" onClick={() => void stopAndUpload()}><Square className="h-4 w-4" /> Stop & save</Button>
                </div>
              )}
              {phase === "uploading" && (
                <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm">Saving your answer…</p>
                </div>
              )}
              {phase === "recorded" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm font-medium">Answer saved.</p>
                  <Button variant="outline" size="sm" onClick={() => initQuestion(current)}><RotateCcw className="h-4 w-4" /> Re-record</Button>
                </div>
              )}
              {phase === "error" && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-destructive">{uploadError ?? "Something went wrong."}</p>
                  <Button variant="outline" size="sm" onClick={() => initQuestion(current)}><RotateCcw className="h-4 w-4" /> Retry</Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => void skipCurrent()} disabled={phase === "uploading" || submitting}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
            <Button onClick={() => void advance()} disabled={advanceDisabled}>
              {isMcq
                ? (isLast ? <><Send className="h-4 w-4" /> Save & finish</> : "Save & continue →")
                : (isLast ? <><Send className="h-4 w-4" /> Finish & submit</> : "Next question →")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your answers auto-save as you go. If you get disconnected, reopen this exam to resume.
      </p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>
              You've answered {answeredCount} of {total} questions. Once submitted, your responses are sent for evaluation and cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Keep working</Button>
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Spinner /> : <Send className="h-4 w-4" />} Submit exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
