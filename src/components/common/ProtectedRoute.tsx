import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { FullPageSpinner } from "@/components/ui/spinner";

/** Gate for authenticated areas. Renders children once a session is present. */
export function ProtectedRoute() {
  const { session, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) return <FullPageSpinner label="Loading your workspace…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Redirects already-authenticated users away from public auth screens. */
export function PublicOnlyRoute() {
  const { session, initialized } = useAuth();
  if (!initialized) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}
