"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Building2,
  Compass,
  FolderOpen,
  Inbox,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { listSkills } from "@/lib/api/skills";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const NAV: {
  href: string;
  label: string;
  roles: Role[];
  icon: React.ComponentType<{ className?: string }>;
  count?: "pending" | "mine";
}[] = [
  { href: "/review", label: "Review queue", roles: ["admin"], icon: Inbox, count: "pending" },
  { href: "/", label: "Catalog", roles: ["member", "admin"], icon: Compass },
  { href: "/departments", label: "Visibility", roles: ["admin"], icon: Building2 },
  { href: "/members", label: "Members", roles: ["admin"], icon: Users },
  { href: "/my-skills", label: "My submissions", roles: ["member"], icon: FolderOpen, count: "mine" },
  { href: "/submit", label: "Submit", roles: ["member"], icon: Upload },
];

function initials(name?: string) {
  return (name ?? "SH")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function activeFor(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const { role, user, logout } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pending = useQuery({
    queryKey: ["nav", "pending"],
    queryFn: () => listSkills({ status: "pending", limit: 1 }),
    enabled: role === "admin",
  });
  const mine = useQuery({
    queryKey: ["nav", "mine"],
    queryFn: () => listSkills({ owner: "me", status: "all", limit: 1 }),
    enabled: role === "member",
  });

  const nav = NAV.filter((item) => role && item.roles.includes(role));
  const counts = {
    pending: pending.data?.pagination.total,
    mine: mine.data?.pagination.total,
  };

  const note =
    role === "admin"
      ? "Review decisions are made from evidence, then scoped by department visibility."
      : "You can install published skills for your department and manage your own submissions.";

  const accountRole = role === "admin" ? "Admin" : user?.department ? `Member - ${user.department.name}` : "Member";

  const navMarkup = (drawer = false) => (
    <nav className={drawer ? "drawer-nav" : "side-nav"} aria-label={drawer ? "Mobile navigation" : "Primary navigation"}>
      {nav.map((item) => {
        const Icon = item.icon;
        const count = item.count ? counts[item.count] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={clsx(activeFor(pathname, item.href) && "active")}
          >
            <Icon className="icon" />
            <span>{item.label}</span>
            {typeof count === "number" && count > 0 && <span className="count">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const authLinks = (
    <div className="grid gap-2">
      <Link href="/login" className="btn rail" onClick={() => setDrawerOpen(false)}>
        <LogIn className="icon" />
        Sign in
      </Link>
      <Link href="/register" className="btn ghost" onClick={() => setDrawerOpen(false)}>
        Create account
      </Link>
    </div>
  );

  const account = user ? (
    <div className="account-card">
      <div className="account-row">
        <div className={`avatar ${role === "admin" ? "admin" : ""}`}>{initials(user.display_name)}</div>
        <div className="account-name">
          <strong>{user.display_name}</strong>
          <span>{accountRole}</span>
        </div>
      </div>
      <button className="btn rail" onClick={logout} type="button">
        <LogOut className="icon" />
        Sign out
      </button>
    </div>
  ) : (
    <div className="account-card">{authLinks}</div>
  );

  return (
    <>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Skill Hub home">
          <span className="brand-mark">
            <ShieldCheck className="icon" />
          </span>
          <span>Skill Hub</span>
        </Link>
        {account}
        {role && <div className="nav-label">Workspace</div>}
        {role ? navMarkup() : authLinks}
        {role && <div className="side-note">{note}</div>}
      </aside>

      <div className="mobile-bar">
        <button className="icon-btn" onClick={() => setDrawerOpen((open) => !open)} aria-label="Open navigation">
          {drawerOpen ? <X className="icon" /> : <Menu className="icon" />}
        </button>
        <Link href="/" className="mobile-brand">
          <span className="brand-mark">
            <ShieldCheck className="icon" />
          </span>
          <span>Skill Hub</span>
        </Link>
        {user ? (
          <button className="icon-btn" onClick={logout} aria-label="Sign out">
            <LogOut className="icon" />
          </button>
        ) : (
          <Link href="/login" className="icon-btn" aria-label="Sign in">
            <LogIn className="icon" />
          </Link>
        )}
      </div>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4">{account}</div>
            {role ? navMarkup(true) : authLinks}
            {role && <div className="side-note">{note}</div>}
          </aside>
        </div>
      )}
    </>
  );
}
