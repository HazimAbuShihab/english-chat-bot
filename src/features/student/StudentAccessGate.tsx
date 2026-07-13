import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getActiveAssignment } from "@/features/student/api";
import { NoActiveExam } from "@/features/student/NoActiveExam";
import { FullPageSpinner } from "@/components/ui/spinner";

/**
 * Gate for the main application. Admins and super admins pass through freely.
 * Students may only enter the app while they have an active (takeable) exam;
 * otherwise they see the locked "No active exam" screen.
 */
export function StudentAccessGate() {
  const { role, user } = useAuth();
  const isStudent = role === "student";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["active-assignment", user?.id],
    queryFn: () => getActiveAssignment(user!.id),
    enabled: isStudent && !!user,
    staleTime: 0,
  });

  if (!isStudent) return <Outlet />;
  if (isLoading) return <FullPageSpinner label="Checking your exams…" />;
  // On a transient error, fail open to the locked screen (safer default).
  if (isError || !data) return <NoActiveExam />;
  return <Outlet />;
}
