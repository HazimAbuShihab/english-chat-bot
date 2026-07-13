import { CEFR_LEVELS, CEFR_COLORS } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/** Horizontal CEFR distribution bars from an {A1: n, ...} map. */
export function CefrDistribution({
  distribution,
}: {
  distribution: Partial<Record<Enums<"cefr_level">, number>>;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No evaluated results yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {CEFR_LEVELS.map((level) => {
        const count = distribution[level] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={level} className="flex items-center gap-3">
            <span className={cn("w-8 rounded px-1 text-center text-xs font-semibold", CEFR_COLORS[level])}>{level}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
