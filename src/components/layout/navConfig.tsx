import {
  LayoutDashboard,
  ClipboardList,
  ListChecks,
  FileQuestion,
  GraduationCap,
  Users,
  Building2,
  FileText,
  Mic,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { RoleKey } from "@/lib/constants";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export function navSectionsForRole(role: RoleKey | null): NavSection[] {
  if (role === "student") {
    return [
      {
        items: [
          { to: "/", label: "My Exam", icon: Mic, end: true },
          { to: "/profile", label: "Profile", icon: UserCircle },
        ],
      },
    ];
  }

  if (role === "org_admin") {
    return [
      {
        title: "Overview",
        items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
      },
      {
        title: "Content",
        items: [
          { to: "/questions", label: "Question Bank", icon: FileQuestion },
          { to: "/templates", label: "Exam Templates", icon: ListChecks },
          { to: "/exams-admin", label: "Exams", icon: ClipboardList },
        ],
      },
      {
        title: "People & Results",
        items: [
          { to: "/students", label: "Students", icon: GraduationCap },
          { to: "/reports", label: "Results & Reports", icon: FileText },
        ],
      },
      {
        title: "Account",
        items: [{ to: "/profile", label: "Profile", icon: UserCircle }],
      },
    ];
  }

  if (role === "super_admin") {
    return [
      {
        items: [
          { to: "/", label: "Platform Dashboard", icon: LayoutDashboard, end: true },
          { to: "/organizations", label: "Organizations", icon: Building2 },
          { to: "/users", label: "Users", icon: Users },
          { to: "/questions", label: "Global Question Bank", icon: FileQuestion },
        ],
      },
      {
        title: "Account",
        items: [{ to: "/profile", label: "Profile", icon: UserCircle }],
      },
    ];
  }

  return [];
}
