import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Printer, Mic, Building2, User, CalendarDays } from "lucide-react";
import { getReportData } from "@/features/reports/api";
import { EvaluationSummary } from "@/features/results/EvaluationSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CefrBadge } from "@/components/common/CefrBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FullPageSpinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/lib/constants";
import { displayScore } from "@/lib/utils";

export default function ReportDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => getReportData(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) return <FullPageSpinner label="Building report…" />;
  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Report not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/reports"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  const { student, exam, evaluation } = data;
  const overall = evaluation?.overall_score ?? null;
  const passed = exam && overall != null ? overall >= exam.passing_score : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between no-print">
        <Button asChild variant="ghost" size="sm"><Link to="/reports"><ArrowLeft className="h-4 w-4" /> Results</Link></Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
      </div>

      <div className="print-area space-y-6">
        {/* Letterhead */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Mic className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Speaking Assessment Report</p>
            </div>
          </div>
          {passed !== undefined && <Badge variant={passed ? "success" : "destructive"}>{passed ? "PASS" : "FAIL"}</Badge>}
        </div>

        {/* Candidate & exam info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Candidate</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{student?.full_name ?? "Unnamed"}</p>
              <p className="text-muted-foreground">{student?.email}</p>
              {student?.native_language && <p className="text-muted-foreground">First language: {student.native_language}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Assessment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{exam?.title}</p>
              <p className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {data.session.submitted_at ? format(new Date(data.session.submitted_at), "PPP") : "Not submitted"}</p>
              <p className="text-muted-foreground">Passing score: {exam?.passing_score}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Scores */}
        {evaluation && evaluation.status === "completed" ? (
          <>
            <EvaluationSummary evaluation={evaluation} passingScore={exam?.passing_score} />

            {data.answerEvaluations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Per-question scores</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead className="text-center">Grammar</TableHead>
                        <TableHead className="text-center">Vocab</TableHead>
                        <TableHead className="text-center">Pron.</TableHead>
                        <TableHead className="text-center">Fluency</TableHead>
                        <TableHead className="text-center">Overall</TableHead>
                        <TableHead>CEFR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.answerEvaluations.map((ae) => (
                        <TableRow key={ae.id}>
                          <TableCell className="max-w-[12rem]"><p className="truncate text-sm font-medium">{ae.question?.title ?? "Question"}</p></TableCell>
                          <TableCell className="text-center tabular-nums">{displayScore(ae.grammar_score)}</TableCell>
                          <TableCell className="text-center tabular-nums">{displayScore(ae.vocabulary_score)}</TableCell>
                          <TableCell className="text-center tabular-nums">{displayScore(ae.pronunciation_score)}</TableCell>
                          <TableCell className="text-center tabular-nums">{displayScore(ae.fluency_score)}</TableCell>
                          <TableCell className="text-center font-semibold tabular-nums">{displayScore(ae.overall_score)}</TableCell>
                          <TableCell><CefrBadge level={ae.cefr_level} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {evaluation.improvements && evaluation.improvements.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {evaluation.improvements.map((s, i) => <li key={i} className="flex gap-2"><span className="text-primary">{i + 1}.</span> {s}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">This attempt has not been evaluated yet.</CardContent></Card>
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Generated {format(new Date(), "PPpp")} · {APP_NAME}
        </p>
      </div>
    </div>
  );
}
