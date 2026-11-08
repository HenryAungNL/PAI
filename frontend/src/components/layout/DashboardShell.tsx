import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Search, Settings, X, type LucideIcon } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

interface DashboardShellProps {
  navItems: NavItem[];
  /** Short label shown next to the logo (e.g. "Student", "Admin"). */
  workspace: string;
  settingsPath?: string;
}

/**
 * Shared application shell for the student, instructor and admin workspaces.
 * A fixed sidebar on desktop becomes a slide-in drawer on mobile.
 */
export function DashboardShell({ navItems, workspace, settingsPath = "/dashboard/settings" }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-background transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label={`${workspace} navigation`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <Logo compact />
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-700">
              {workspace}
            </span>
          </div>
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-neutral-600 hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            to={settingsPath}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/courses"
            className="hidden items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary-200 md:flex md:w-64"
          >
            <Search className="h-4 w-4" aria-hidden />
            Search courses…
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-muted-foreground">
              <Bell />
            </Button>
            <Link to={settingsPath} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted">
              <Avatar src={user?.avatar || user?.avatar_url} name={user?.full_name ?? "User"} size="sm" />
              <span className="hidden text-sm font-medium sm:inline">{user?.full_name}</span>
            </Link>
          </div>
        </header>

        <main id="workspace-main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
