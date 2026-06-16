"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { login as apiLogin } from "@/lib/api/auth";
import type { AuthUser, Role } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/store";

// Seeded accounts (app/seed.py) — power the sidebar "demo as" role switcher (implement.md §5.3).
export const DEMO_CREDENTIALS: Record<"creator" | "admin", { email: string; password: string }> = {
  admin: { email: "admin@skillhub.example", password: "admin12345" },
  creator: { email: "mina@example.com", password: "creator123" },
};

interface AuthState {
  user: AuthUser | null;
  role: Role;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  demoAs: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(tokenStore.user());
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const bundle = await apiLogin(email, password);
    tokenStore.set(bundle);
    setUser(bundle.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const demoAs = useCallback(
    async (role: Role) => {
      if (role === "visitor") {
        logout();
        return;
      }
      const creds = DEMO_CREDENTIALS[role];
      await login(creds.email, creds.password);
    },
    [login, logout],
  );

  const role: Role = user?.role ?? "visitor";

  return (
    <AuthContext.Provider value={{ user, role, ready, login, logout, demoAs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
