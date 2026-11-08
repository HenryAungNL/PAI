import {
  BarChart3,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Star,
  Users,
} from "lucide-react";

import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { useAdminStats } from "@/hooks/useApi";

const adminNav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/courses", label: "Course moderation", icon: GraduationCap },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/enrollments", label: "Enrollments", icon: BarChart3 },
  { to: "/admin/orders", label: "Orders & refunds", icon: Receipt },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

/** Platform administration workspace (custom React dashboard, not Django admin). */
export function AdminLayout() {
  const { data: stats } = useAdminStats();

  const nav = adminNav.map((item) => {
    if (item.to === "/admin/courses" && stats) {
      return { ...item, badge: stats.courses.pending };
    }
    if (item.to === "/admin/reviews" && stats) {
      return { ...item, badge: stats.reviews.reported };
    }
    return { ...item, badge: item.badge };
  });

  return <DashboardShell workspace="Admin" navItems={nav} settingsPath="/admin/settings" />;
}
