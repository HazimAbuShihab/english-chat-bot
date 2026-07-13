import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme/ThemeProvider";

/** App-wide toast host. Uses Sonner and follows the active theme. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border",
        },
      }}
    />
  );
}

export { toast } from "sonner";
