import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute, RoleRoute } from "@/components/layout/RouteGuards";
import type { User } from "@/types";

const authState = vi.hoisted(() => ({
  value: { status: "loading", user: null } as { status: string; user: User | null },
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => authState.value,
}));

function renderRoutes(initialEntries: string[] = ["/private"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<div>Private content</div>} />
        </Route>
        <Route element={<RoleRoute roles={["admin"]} />}>
          <Route path="/admin" element={<div>Admin content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.value = { status: "loading", user: null };
  });

  it("shows a loading screen while the session bootstraps", () => {
    renderRoutes();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("redirects anonymous visitors to the login screen", () => {
    authState.value = { status: "anonymous", user: null };
    renderRoutes();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    authState.value = { status: "authenticated", user: { role: "student" } as User };
    renderRoutes();
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});

describe("RoleRoute", () => {
  it("blocks a user without the required role", () => {
    authState.value = { status: "authenticated", user: { role: "student" } as User };
    renderRoutes(["/admin"]);
    expect(screen.getByText(/do not have access/i)).toBeInTheDocument();
  });

  it("allows a user with the required role", () => {
    authState.value = { status: "authenticated", user: { role: "admin" } as User };
    renderRoutes(["/admin"]);
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
