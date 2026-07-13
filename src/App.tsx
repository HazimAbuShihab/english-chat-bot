import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/common/ProtectedRoute";
import { RoleGuard } from "@/components/common/RoleGuard";
import { StudentAccessGate } from "@/features/student/StudentAccessGate";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { FullPageSpinner } from "@/components/ui/spinner";

// Auth
import LoginPage from "@/features/auth/pages/LoginPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import StudentCodeLoginPage from "@/features/auth/pages/StudentCodeLoginPage";

// Lazily-loaded authenticated areas keep the initial auth bundle small.
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const QuestionsPage = lazy(() => import("@/features/questions/QuestionsPage"));
const TemplatesPage = lazy(() => import("@/features/exams/TemplatesPage"));
const ExamsAdminPage = lazy(() => import("@/features/exams/ExamsAdminPage"));
const StudentsPage = lazy(() => import("@/features/students/StudentsPage"));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage"));
const ReportDetailPage = lazy(() => import("@/features/reports/ReportDetailPage"));
const OrganizationsPage = lazy(() => import("@/features/organizations/OrganizationsPage"));
const UsersPage = lazy(() => import("@/features/organizations/UsersPage"));

const ExamIntroPage = lazy(() => import("@/features/exam-session/pages/ExamIntroPage"));
const ExamRunnerPage = lazy(() => import("@/features/exam-session/pages/ExamRunnerPage"));
const ExamResultPage = lazy(() => import("@/features/exam-session/pages/ExamResultPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public auth screens */}
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/join" element={<StudentCodeLoginPage />} />
          </Route>
        </Route>
        {/* Reachable via email recovery link even with a temporary session */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute />}>
          {/* Main app shell. Students may only enter while they have an active exam. */}
          <Route element={<StudentAccessGate />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route element={<RoleGuard allow={["org_admin", "super_admin"]} />}>
                <Route path="/questions" element={<QuestionsPage />} />
              </Route>

              <Route element={<RoleGuard allow={["org_admin"]} />}>
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/exams-admin" element={<ExamsAdminPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/:sessionId" element={<ReportDetailPage />} />
              </Route>

              <Route element={<RoleGuard allow={["super_admin"]} />}>
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Focused exam-taking flow (no sidebar; ungated so results show at completion) */}
          <Route element={<FocusLayout />}>
            <Route path="/exam/:examId/intro" element={<ExamIntroPage />} />
            <Route path="/session/:sessionId" element={<ExamRunnerPage />} />
            <Route path="/session/:sessionId/result" element={<ExamResultPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
