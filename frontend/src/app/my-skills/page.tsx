"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listSkills } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MySkillsPage() {
  const { role } = useAuth();

  const query = useQuery({
    queryKey: ["skills", "mine"],
    queryFn: () => listSkills({ owner: "me", status: "all", sort: "newest" }),
    enabled: role !== "visitor",
  });

  if (role === "visitor") {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-100">My submissions</h2>
        <p className="text-sm text-zinc-400">
          Sign in as a creator (sidebar switch or{" "}
          <Link href="/login" className="text-sky-400 hover:underline">
            login
          </Link>
          ) to see your submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">My submissions</h2>
          <p className="mt-1 text-sm text-zinc-400">Every skill you’ve submitted, across all states.</p>
        </div>
        <Link
          href="/submit"
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          + Submit a skill
        </Link>
      </header>

      {query.isPending ? (
        <div className="py-16">
          <Spinner />
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load your submissions." onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          hint="Submit your first skill to see it here."
          actionLabel="Submit a skill"
          onAction={() => (window.location.href = "/submit")}
        />
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {query.data.data.map((skill) => (
            <li key={skill.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/skill/${skill.slug}`} className="font-medium text-zinc-100 hover:text-sky-300">
                  {skill.name}
                </Link>
                <p className="truncate text-xs text-zinc-500">{skill.summary}</p>
                {skill.status === "rejected" && skill.rejection_reason && (
                  <p className="mt-0.5 text-xs text-rose-400">Reason: {skill.rejection_reason}</p>
                )}
              </div>
              <StatusBadge status={skill.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
