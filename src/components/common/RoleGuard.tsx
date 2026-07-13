import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { FullPageSpinner } from "@/components/ui/spinner";
import type { RoleKey } from "@/lib/constants";

/**
 * Restrict a set of routes to specific roles. Unauthorized users are bounced
 * to their own dashboard rather than shown an error.
 */
export function RoleGuard({ allow }: { allow: RoleKey[] }) {
  const { role, initialized, loading } = useAuth();
  if (!initialized || loading) return <FullPageSpinner />;
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
