import { cn } from "@/lib/utils";

/** Segmented microphone input-level meter (0..1). */
export function MicLevelMeter({ level, active }: { level: number; active: boolean }) {
  const bars = 24;
  const filled = Math.round(level * bars);
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const on = active && i < filled;
        const height = 20 + (i / bars) * 80;
        return (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-colors",
              on
                ? i > bars * 0.8
                  ? "bg-destructive"
                  : i > bars * 0.6
                    ? "bg-warning"
                    : "bg-success"
                : "bg-muted",
            )}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}
