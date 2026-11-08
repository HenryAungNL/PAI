import { Navigate, Outlet, useLocation } from "react-router-dom";

import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/features/auth/AuthContext";
import type { UserRole } from "@/types";

/** Full-page loading state shown while the auth bootstrap runs. */
function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <Logo />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
    </div>
  );
}

/**
 * Requires an authenticated user. Unauthenticated visitors are redirected to
 * the sign-in page, preserving the intended destination.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoading />;
  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Outlet />;
}

/**
 * Requires the authenticated user to hold one of the given roles. This is a UX
 * guard only — the API enforces authorization independently.
 */
export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { status, user } = useAuth();

  if (status === "loading") return <AuthLoading />;
  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return (
      <div className="container py-20">
        <EmptyState
          title="You do not have access to this area"
          description="This section is limited to a different account role. If you believe this is a mistake, please contact support."
          action={
            <Button onClick={() => window.history.back()}>
              Go back
            </Button>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}
