"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useToast } from "@/components/Toaster";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Catalog", roles: ["visitor", "creator", "admin"] },
  { href: "/submit", label: "Submit a skill", roles: ["creator", "admin"] },
  { href: "/my-skills", label: "My submissions", roles: ["creator", "admin"] },
  { href: "/review", label: "Review queue", roles: ["admin"] },
];

const ROLES: Role[] = ["visitor", "creator", "admin"];

export function Sidebar() {
  const { role, user, demoAs } = useAuth();
  const toast = useToast();
  const pathname = usePathname();

  async function switchRole(r: Role) {
    try {
      await demoAs(r);
      toast("info", r === "visitor" ? "Browsing as a visitor." : `Signed in as ${r}.`);
    } catch {
      toast("error", "Demo sign-in failed — is the backend running?");
    }
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col gap-6 border-r border-zinc-800 bg-zinc-900/60 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Skill Hub</p>
        <h1 className="text-lg font-semibold text-zinc-100">Review Command Center</h1>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Demo as</p>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={clsx(
                "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition",
                role === r ? "bg-sky-600 text-white" : "text-zinc-400 hover:bg-zinc-800",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {user ? (
            <>
              Signed in as <span className="text-zinc-300">{user.display_name}</span>
            </>
          ) : (
            "Not signed in"
          )}
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
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

      <div className="mt-auto border-t border-zinc-800 pt-4 text-xs text-zinc-500">
        <Link href="/login" className="text-zinc-400 hover:text-zinc-200">
          Sign in manually →
        </Link>
        <p className="mt-2 leading-relaxed">
          Permissions and visibility are enforced by the API; the role switcher only mirrors them in
          the UI.
        </p>
      </div>
    </aside>
  );
}
