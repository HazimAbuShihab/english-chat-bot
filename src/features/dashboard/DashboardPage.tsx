import { useAuth } from "@/features/auth/AuthProvider";
import { StudentExamHome } from "@/features/student/StudentExamHome";
import { OrgAdminDashboard } from "@/features/dashboard/OrgAdminDashboard";
import { SuperAdminDashboard } from "@/features/dashboard/SuperAdminDashboard";
import { FullPageSpinner } from "@/components/ui/spinner";

/** Renders the correct home for the signed-in user's role. */
export default function DashboardPage() {
  const { role, loading } = useAuth();
  if (loading || !role) return <FullPageSpinner />;
  if (role === "super_admin") return <SuperAdminDashboard />;
  if (role === "org_admin") return <OrgAdminDashboard />;
  // Students land on their active exam (access is gated by StudentAccessGate).
  return <StudentExamHome />;
}
