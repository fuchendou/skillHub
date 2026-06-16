"use client";

import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Renders children only when the current role is allowed. Admin-only controls are HIDDEN
 * (not disabled) for non-admins per spec.md §5 — but this is UX only; the API still enforces
 * the boundary server-side (implement.md §5.3).
 */
export function RoleGate({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { role } = useAuth();
  if (!allow.includes(role)) return null;
  return <>{children}</>;
}
