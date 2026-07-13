import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { findExamByJoinCode, signInWithPassword } from "@/features/auth/api";

type FoundExam = { id: string; title: string; description: string | null };

export default function StudentCodeLoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = React.useState("");
  const [exam, setExam] = React.useState<FoundExam | null>(null);
  const [checking, setChecking] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signingIn, setSigningIn] = React.useState(false);

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    try {
      const found = await findExamByJoinCode(code);
      if (!found) {
        toast.error("No active exam matches that code.");
        return;
      }
      setExam(found);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setChecking(false);
    }
  };

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      await signInWithPassword(email, password);
      toast.success("Signed in");
      navigate(exam ? `/exam/${exam.id}/intro` : "/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Join an exam</h2>
        <p className="text-sm text-muted-foreground">
          Enter the exam code your instructor gave you, then sign in.
        </p>
      </div>

      {!exam ? (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Exam code</Label>
            <Input
              id="code"
              placeholder="e.g. DEMO2026"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="tracking-widest"
              autoCapitalize="characters"
            />
            <p className="text-xs text-muted-foreground">Try the demo code <span className="font-mono font-medium">DEMO2026</span>.</p>
          </div>
          <Button type="submit" className="w-full" disabled={checking}>
            {checking ? <Spinner /> : <ArrowRight className="h-4 w-4" />} Continue
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-accent/50 p-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">Active</Badge>
              <span className="text-xs text-muted-foreground">Code {code}</span>
            </div>
            <p className="mt-2 font-semibold">{exam.title}</p>
            {exam.description && <p className="text-sm text-muted-foreground">{exam.description}</p>}
          </div>

          <form onSubmit={doSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="j-email">Email</Label>
              <Input id="j-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="j-password">Password</Label>
              <Input id="j-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={signingIn}>
              {signingIn ? <Spinner /> : <LogIn className="h-4 w-4" />} Sign in & start
            </Button>
          </form>

          <Button type="button" variant="ghost" className="w-full" onClick={() => setExam(null)}>
            <KeyRound className="h-4 w-4" /> Use a different code
          </Button>
        </div>
      )}

      <Button asChild variant="ghost" className="w-full">
        <Link to="/login"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      </Button>
    </div>
  );
}
