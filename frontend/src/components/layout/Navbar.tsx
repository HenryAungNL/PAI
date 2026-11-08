import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Explore Courses" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const { user, status, logout, isAdmin, isInstructor } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(search.trim())}`);
    setMobileOpen(false);
  };

  const dashboardPath = isAdmin ? "/admin" : isInstructor ? "/instructor" : "/dashboard";
  const settingsPath = isAdmin ? "/admin/settings" : "/dashboard/settings";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-neutral-600 hover:bg-muted hover:text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 items-center md:flex" role="search">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {status === "loading" ? (
            <div className="h-9 w-24 skeleton rounded-lg" aria-hidden />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar src={user.avatar || user.avatar_url} name={user.full_name} size="sm" />
                <span className="hidden text-sm font-medium sm:inline">{user.first_name || "Account"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 animate-slide-up overflow-hidden rounded-xl border border-border bg-white py-1 shadow-card-hover"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold">{user.full_name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">{user.role}</p>
                  </div>
                  <MenuItem to={dashboardPath} icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>
                    {isAdmin ? "Admin dashboard" : isInstructor ? "Instructor dashboard" : "My dashboard"}
                  </MenuItem>
                  {!isAdmin && !isInstructor && (
                    <MenuItem to="/dashboard/learning" icon={BookOpen} onClick={() => setMenuOpen(false)}>
                      My learning
                    </MenuItem>
                  )}
                  {!isAdmin && !isInstructor && (
                    <MenuItem to="/dashboard/bookmarks" icon={Heart} onClick={() => setMenuOpen(false)}>
                      Saved courses
                    </MenuItem>
                  )}
                  {isAdmin && (
                    <MenuItem to="/admin" icon={Shield} onClick={() => setMenuOpen(false)}>
                      Platform admin
                    </MenuItem>
                  )}
                  <MenuItem to={settingsPath} icon={Settings} onClick={() => setMenuOpen(false)}>
                    Settings
                  </MenuItem>
                  <button
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate("/");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Sign up
              </Button>
            </>
          )}

          <button
            className="rounded-lg p-2 text-neutral-600 hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-white lg:hidden">
          <nav className="container flex flex-col py-3" aria-label="Mobile navigation">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-3 text-sm font-medium",
                    isActive ? "bg-primary-50 text-primary" : "text-neutral-700 hover:bg-muted",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user && (
              <Link
                to={dashboardPath}
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-3 text-sm font-semibold text-primary"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Go to dashboard
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuItem({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      {children}
    </Link>
  );
}

export { UserIcon };
