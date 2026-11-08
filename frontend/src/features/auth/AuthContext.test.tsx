import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import type { User } from "@/types";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
  upload: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
    put: mocks.put,
    upload: mocks.upload,
  },
  refreshAccessToken: mocks.refreshAccessToken,
  setAccessToken: mocks.setAccessToken,
  getAccessToken: () => null,
  buildQuery: () => "",
  ApiError: class ApiError extends Error {
    status = 400;
    code = "error";
    details = {};
  },
}));

const student: User = {
  id: 1,
  email: "student@pai.demo",
  first_name: "Sam",
  last_name: "Student",
  full_name: "Sam Student",
  role: "student",
  is_approved: true,
  is_suspended: false,
  avatar: null,
  headline: "",
  bio: "",
  date_joined: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves to anonymous when there is no refresh cookie", async () => {
    mocks.refreshAccessToken.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.user).toBeNull();
  });

  it("restores a session from the refresh cookie on boot", async () => {
    mocks.refreshAccessToken.mockResolvedValue("access-token");
    mocks.get.mockResolvedValue(student);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("student@pai.demo");
    expect(result.current.isStudent).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("signs a user in and stores the access token in memory", async () => {
    mocks.refreshAccessToken.mockResolvedValue(null);
    mocks.post.mockResolvedValue({ access: "new-token", user: student });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await act(async () => {
      await result.current.login("student@pai.demo", "PaiDemo!2024");
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user?.role).toBe("student");
    expect(mocks.setAccessToken).toHaveBeenCalledWith("new-token");
  });

  it("clears the session on logout even if the request fails", async () => {
    mocks.refreshAccessToken.mockResolvedValue("access-token");
    mocks.get.mockResolvedValue(student);
    mocks.post.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
    expect(mocks.setAccessToken).toHaveBeenCalledWith(null);
  });
});
