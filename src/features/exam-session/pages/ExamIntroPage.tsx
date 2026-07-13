import * as React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Play,
  ShieldCheck,
  Square,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import { startExamSession } from "@/features/exam-session/api";
import { useRecorder } from "@/features/exam-session/useRecorder";
import { MicLevelMeter } from "@/features/exam-session/components/MicLevelMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, FullPageSpinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { formatDuration, isExpired } from "@/lib/utils";

async function loadIntro(examId: string, studentId: string) {
  const [{ data: exam, error: examErr }, { data: assignment }] = await Promise.all([
    supabase.from("exams").select("*").eq("id", examId).maybeSingle(),
    supabase
      .from("exam_assignments")
      .select("*")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);
  if (examErr) throw examErr;
  return { exam, assignment };
}

export default function ExamIntroPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const rec = useRecorder();
  const [testUrl, setTestUrl] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["exam-intro", examId],
    queryFn: () => loadIntro(examId!, user!.id),
    enabled: !!examId && !!user,
  });

  // Dispose the microphone only when leaving the page (not on every re-render,
  // which would reset the just-granted permission).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => () => rec.dispose(), []);

  if (isLoading) return <FullPageSpinner label="Loading exam…" />;
  if (!data?.exam) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">Exam unavailable</h2>
        <p className="text-sm text-muted-foreground">This exam could not be found or is not assigned to you.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/exams"><ArrowLeft className="h-4 w-4" /> Back to my exams</Link></Button>
      </div>
    );
  }

  const exam = data.exam;
  const settings = (exam.settings ?? {}) as Record<string, unknown>;
  const instructions = (settings.instructions as string | undefined) ?? exam.description ?? "";
  const totalSeconds = Number(settings.total_time_limit_seconds ?? 0);
  const attemptsUsed = data.assignment?.attempts_used ?? 0;
  const attemptsLeft = exam.max_attempts > 0 ? Math.max(0, exam.max_attempts - attemptsUsed) : Infinity;
  const noAttempts = attemptsLeft <= 0;
  const expired = isExpired(exam.available_until);

  const testRecord = async () => {
    if (rec.status === "recording") {
      const result = await rec.stop();
      if (result) setTestUrl(URL.createObjectURL(result.blob));
    } else {
      setTestUrl(null);
      rec.start();
    }
  };

  const beginExam = async () => {
    if (!examId) return;
    setStarting(true);
    try {
      const sessionId = await startExamSession(examId);
      rec.dispose();
      navigate(`/session/${sessionId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the exam");
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/exams"><ArrowLeft className="h-4 w-4" /> My exams</Link></Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={expired ? "destructive" : "success"}>{expired ? "Expired" : "Ready to start"}</Badge>
          {exam.max_attempts > 0 && (
            <Badge variant="secondary">{attemptsLeft === Infinity ? "Unlimited attempts" : `${attemptsLeft} attempt(s) left`}</Badge>
          )}
          {exam.available_until && !expired && (
            <Badge variant="warning" className="gap-1"><CalendarClock className="h-3 w-3" /> Closes {formatDistanceToNow(new Date(exam.available_until), { addSuffix: true })}</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
        {exam.description && <p className="text-muted-foreground">{exam.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Time limit</p><p className="font-semibold">{totalSeconds ? formatDuration(totalSeconds) : "Per question"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Passing score</p><p className="font-semibold">{exam.passing_score}%</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <Mic className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Format</p><p className="font-semibold">Spoken answers</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {instructions ? (
            <p className="whitespace-pre-line leading-relaxed">{instructions}</p>
          ) : (
            <p>Answer each question aloud using your microphone. You'll have preparation time before recording.</p>
          )}
          <ul className="space-y-1.5 pt-1">
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> Find a quiet place with a stable internet connection.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> Your progress is auto-saved — you can resume if disconnected.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> Speak clearly and answer as fully as you can.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Microphone check</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!rec.supported ? (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <MicOff className="h-4 w-4" /> Recording isn't supported in this browser. Try a recent Chrome, Edge, or Firefox.
            </div>
          ) : rec.permission !== "granted" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Allow microphone access, then say a few words to test your levels.</p>
              <Button onClick={() => void rec.requestPermission()}><Mic className="h-4 w-4" /> Allow microphone</Button>
              {rec.error && <p className="text-sm text-destructive">{rec.error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                <MicLevelMeter level={rec.level} active />
                <div className="ml-auto flex items-center gap-2">
                  {rec.status === "recording" && <span className="text-sm tabular-nums text-muted-foreground">{formatDuration(rec.elapsed)}</span>}
                  <Button variant={rec.status === "recording" ? "destructive" : "outline"} size="sm" onClick={() => void testRecord()}>
                    {rec.status === "recording" ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Test record</>}
                  </Button>
                </div>
              </div>
              {testUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Play back your test recording:</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={testUrl} controls className="w-full" />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Microphone connected.</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {expired
            ? "This exam has expired and can no longer be taken."
            : noAttempts
              ? "You have used all attempts for this exam."
              : "When you're ready, start the exam. The timer begins immediately."}
        </p>
        <Button size="lg" disabled={rec.permission !== "granted" || starting || noAttempts || expired} onClick={() => void beginExam()}>
          {starting ? <Spinner /> : <Play className="h-4 w-4" />} Start exam
        </Button>
      </div>
    </div>
  );
}
