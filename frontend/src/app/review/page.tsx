"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

import { SkillActions } from "@/components/SkillActions";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listSkills } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

const TABS = ["pending", "published", "rejected", "unpublished", "all"] as const;
type Tab = (typeof TABS)[number];

export default function ReviewPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");

  const query = useQuery({
    queryKey: ["skills", "review", tab],
    queryFn: () => listSkills({ status: tab, sort: tab === "pending" ? "name" : "newest", limit: 50 }),
    enabled: role === "admin",
  });

  if (role !== "admin") {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-100">Review queue</h2>
        <p className="text-sm text-zinc-400">
          Admins only. Use the “Admin” switch in the sidebar to view the queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Review queue</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Publish, reject, feature, or unpublish submissions. Actions are idempotent and safe to retry.
        </p>
      </header>

      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-3 py-2 text-sm font-medium capitalize transition",
              tab === t
                ? "border-b-2 border-sky-500 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="py-16">
          <Spinner />
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load the queue." onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState title={`No ${tab === "all" ? "" : tab} skills`} hint="Nothing to review here right now." />
      ) : (
        <ul className="space-y-3">
          {query.data.data.map((skill) => (
            <li key={skill.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/review/${skill.id}`}
                      className="font-medium text-zinc-100 hover:text-sky-300"
                    >
                      {skill.name}
                    </Link>
                    {skill.is_featured && <span title="Featured">⭐</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {skill.category.name} · by {skill.owner.display_name}
                    {skill.risk_label ? ` · ${skill.risk_label}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{skill.summary}</p>
                </div>
                <StatusBadge status={skill.status} />
              </div>
              <div className="mt-3">
                <SkillActions skill={skill} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
