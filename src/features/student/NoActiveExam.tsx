import { LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Full-screen lock state shown to a student who has no active exam. A student
 * only regains access once an administrator assigns them a new active exam.
 */
export function NoActiveExam() {
  const { profile, signOut } = useAuth();
  const qc = useQueryClient();
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-8">
        <Brand />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LockKeyhole className="h-7 w-7" />
            </span>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold">No active exam</h1>
              <p className="text-sm text-muted-foreground">
                Hi {firstName}, you don't have an exam to take right now. Your access will reopen
                automatically once your instructor assigns you a new exam.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button onClick={() => qc.invalidateQueries({ queryKey: ["active-assignment"] })}>
                <RefreshCw className="h-4 w-4" /> Check again
              </Button>
              <Button variant="outline" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
