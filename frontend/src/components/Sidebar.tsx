"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Catalog", roles: ["member", "admin"] },
  { href: "/submit", label: "Submit a skill", roles: ["member", "admin"] },
  { href: "/my-skills", label: "My submissions", roles: ["member", "admin"] },
  { href: "/review", label: "Review queue", roles: ["admin"] },
  { href: "/departments", label: "Departments", roles: ["admin"] },
  { href: "/members", label: "Members", roles: ["admin"] },
];

export function Sidebar() {
  const { role, user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col gap-6 border-r border-zinc-800 bg-zinc-900/60 p-5">
      <div>
        <p className="text-xs font-semibold uppercase text-sky-400">Skill Hub</p>
        <h1 className="text-lg font-semibold text-zinc-100">Review Command Center</h1>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
        {user ? (
          <div className="space-y-2">
            <div>
              <p className="font-medium text-zinc-100">{user.display_name}</p>
              <p className="text-xs text-zinc-500">
                {user.role}
                {user.department ? ` / ${user.department.name}` : ""}
              </p>
            </div>
            <button onClick={logout} className="text-xs text-zinc-400 hover:text-zinc-200">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-3 text-sm">
            <Link href="/login" className="text-sky-300 hover:text-sky-200">
              Sign in
            </Link>
            <Link href="/register" className="text-zinc-400 hover:text-zinc-200">
              Register
            </Link>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.filter((item) => role && item.roles.includes(role)).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium transition",
                active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
