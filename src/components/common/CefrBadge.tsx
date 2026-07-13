import { cn } from "@/lib/utils";
import { CEFR_COLORS } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";

export function CefrBadge({
  level,
  className,
}: {
  level?: Enums<"cefr_level"> | null;
  className?: string;
}) {
  if (!level) {
    return (
      <span className={cn("inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground", className)}>
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        CEFR_COLORS[level],
        className,
      )}
    >
      {level}
    </span>
  );
}
