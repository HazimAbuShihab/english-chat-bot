import { cn } from "@/lib/utils";
import { displayScore } from "@/lib/utils";

function scoreColor(value: number): string {
  if (value >= 80) return "bg-success";
  if (value >= 60) return "bg-primary";
  if (value >= 40) return "bg-warning";
  return "bg-destructive";
}

/** Horizontal labelled score bar (0–100). */
export function ScoreBar({
  label,
  value,
  className,
}: {
  label: string;
  value?: number | null;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{displayScore(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", scoreColor(pct))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Large circular overall score. */
export function ScoreRing({ value, size = 132 }: { value?: number | null; size?: number }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "text-success" : pct >= 60 ? "text-primary" : pct >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="stroke-secondary" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("transition-all", color)}
          stroke="currentColor"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">{displayScore(value)}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
