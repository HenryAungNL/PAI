import type { UserRole } from "@/types";

/** Landing workspace for a given role after sign-in. */
export function dashboardPathForRole(role: UserRole | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/dashboard";
}
