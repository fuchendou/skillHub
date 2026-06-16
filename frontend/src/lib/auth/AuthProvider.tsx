"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { fetchMe, login as apiLogin } from "@/lib/api/auth";
import type { AuthUser, Role } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/store";

interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSessionUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cached = tokenStore.user();
    setUser(cached);
    if (!tokenStore.access()) {
      setReady(true);
      return;
    }

    fetchMe()
      .then((fresh) => {
        tokenStore.setUser(fresh);
        setUser(fresh);
      })
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const bundle = await apiLogin(email, password);
    tokenStore.set(bundle);
    setUser(bundle.user);
  }, []);

  const setSessionUser = useCallback((nextUser: AuthUser) => {
    tokenStore.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, role, ready, login, setSessionUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
