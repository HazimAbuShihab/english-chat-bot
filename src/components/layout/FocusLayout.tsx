import { Link, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";

/** Distraction-reduced layout for the exam-taking flow (no sidebar). */
export function FocusLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8 no-print">
        <Brand />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><LogOut className="h-4 w-4" /> Exit</Link>
          </Button>
        </div>
      </header>
      <main className="px-4 py-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
