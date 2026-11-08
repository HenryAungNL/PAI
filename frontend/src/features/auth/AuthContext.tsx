import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, refreshAccessToken, setAccessToken } from "@/lib/api";
import type { User, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  isStudent: boolean;
  isInstructor: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  role?: "student" | "instructor";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const queryClient = useQueryClient();

  // On first load, attempt a silent refresh using the HttpOnly cookie so a
  // returning visitor is signed back in without ever persisting a token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setStatus("anonymous");
        return;
      }
      try {
        const me = await api.get<User>("/users/me/");
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (!cancelled) setStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ access: string; user: User }>("/auth/login/", { email, password }, { skipRefresh: true });
    setAccessToken(data.access);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api.post<{ access: string; user: User }>("/auth/register/", payload, { skipRefresh: true });
    setAccessToken(data.access);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/", {});
    } catch {
      // Ignore — we clear local state regardless.
    }
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const token = await refreshAccessToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }
    const me = await api.get<User>("/users/me/");
    setUser(me);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isStudent: user?.role === "student",
      isInstructor: user?.role === "instructor",
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      updateUser: setUser,
      refreshUser,
      hasRole: (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The provider and its hook intentionally live together; splitting them would
// only add indirection.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
