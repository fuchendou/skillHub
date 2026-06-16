// Browser-only token store. SSR-safe: every accessor guards `window`.
import type { AuthUser, TokenBundle } from "@/lib/api/types";

const ACCESS = "sh_access";
const REFRESH = "sh_refresh";
const USER = "sh_user";

export const tokenStore = {
  access(): string | null {
    return typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS);
  },
  refresh(): string | null {
    return typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH);
  },
  user(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set(bundle: TokenBundle): void {
    window.localStorage.setItem(ACCESS, bundle.access_token);
    window.localStorage.setItem(REFRESH, bundle.refresh_token);
    window.localStorage.setItem(USER, JSON.stringify(bundle.user));
  },
  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS);
    window.localStorage.removeItem(REFRESH);
    window.localStorage.removeItem(USER);
  },
};
