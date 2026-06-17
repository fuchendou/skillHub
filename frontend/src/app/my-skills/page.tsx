"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";

import { CategoryTag, FeaturedBadge, visibilityLabel } from "@/components/SkillDisplay";
import { SkillActions } from "@/components/SkillActions";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listSkills } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MySkillsPage() {
  const { ready, role } = useAuth();

  const query = useQuery({
    queryKey: ["skills", "mine"],
    queryFn: () => listSkills({ owner: "me", status: "all", sort: "newest" }),
    enabled: !!role,
  });

  if (!ready) return <Spinner label="Loading session..." />;

  if (!role) {
    return (
      <div className="surface-flat p-6">
        <h1 className="text-2xl font-black text-slate-900">My submissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to see your submissions.{" "}
          <Link href="/login" className="font-bold text-teal-700 hover:text-teal-900">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>My submissions</h1>
          <p>Your drafts, pending reviews, rejected records, and published skills in one place.</p>
        </div>
        <Link href="/submit" className="btn primary">
          <Plus className="icon" />
          Submit
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
        <section className="surface list">
          {query.data.data.map((skill) => (
            <article key={skill.id} className="list-row">
              <div className="row-main">
                <div className="badge-row">
                  {skill.is_featured && <FeaturedBadge />}
                  <StatusBadge status={skill.status} />
                  <CategoryTag label={skill.category.name} />
                </div>
                <h3>{skill.name}</h3>
                <p>{skill.summary}</p>
                {skill.status === "rejected" && skill.rejection_reason && (
                  <p className="mt-1 text-red-700">Reason: {skill.rejection_reason}</p>
                )}
              </div>
              <div className="stack tight">
                <span className="mini">Owner</span>
                <strong>{skill.owner.display_name}</strong>
              </div>
              <div className="stack tight">
                <span className="mini">Scope</span>
                <strong>{visibilityLabel(skill)}</strong>
              </div>
              <div className="stack tight scope-col">
                <span className="mini">Updated</span>
                <strong>{new Date(skill.updated_at).toLocaleDateString()}</strong>
              </div>
              <div className="actions">
                <Link href={`/skill/${skill.slug}`} className="btn secondary small">
                  <FolderOpen className="icon" />
                  Open
                </Link>
                <SkillActions skill={skill} />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
