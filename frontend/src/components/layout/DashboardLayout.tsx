import {
  Award,
  BookOpen,
  Heart,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Video,
} from "lucide-react";

import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { useAuth } from "@/features/auth/AuthContext";
import { useMyEnrollments } from "@/hooks/useApi";

/**
 * Workspace shell for students and instructors. The navigation adapts to the
 * signed-in user's role; the admin workspace lives in {@link AdminLayout}.
 */
export function DashboardLayout() {
  const { isInstructor } = useAuth();
  const { data: enrollments } = useMyEnrollments();

  const activeCount = enrollments?.filter((e) => !e.is_completed).length ?? 0;

  const studentNav: NavItem[] = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/dashboard/learning", label: "My learning", icon: BookOpen, badge: activeCount },
    { to: "/dashboard/bookmarks", label: "Saved courses", icon: Heart },
    { to: "/dashboard/certificates", label: "Certificates", icon: Award },
    { to: "/dashboard/orders", label: "Purchase history", icon: Receipt },
  ];

  const instructorNav: NavItem[] = [
    { to: "/instructor", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/instructor/courses", label: "My courses", icon: Video },
    { to: "/instructor/analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <DashboardShell
      workspace={isInstructor ? "Instructor" : "Student"}
      navItems={isInstructor ? instructorNav : studentNav}
    />
  );
}
