import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Brand({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Mic className="h-5 w-5" />
      </span>
      {!collapsed && (
        <span className="text-sm font-semibold leading-tight">
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
