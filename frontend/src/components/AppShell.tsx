"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (AUTH_ROUTES.has(pathname)) {
    return children;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
