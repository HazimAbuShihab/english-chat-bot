import { Outlet } from "react-router-dom";
import { Mic, ShieldCheck, BarChart3, Headphones } from "lucide-react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const HIGHLIGHTS = [
  { icon: Headphones, title: "Structured speaking exams", text: "Questions served only from your curated bank — never AI-generated." },
  { icon: BarChart3, title: "CEFR-aligned scoring", text: "Grammar, vocabulary, pronunciation, fluency and communication." },
  { icon: ShieldCheck, title: "Secure by design", text: "Row-level security, role-based access and audit logging." },
];

/** Split-screen layout for all unauthenticated pages. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <Brand className="relative text-primary-foreground [&_span:last-child]:text-primary-foreground" />
        <div className="relative space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Mic className="h-3.5 w-3.5" /> English Speaking Assessment
            </span>
            <h1 className="max-w-md text-3xl font-bold leading-tight">
              Evaluate spoken English with confidence and consistency.
            </h1>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <h.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-sm text-primary-foreground/80">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Speaking Assessment Platform
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Brand className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
