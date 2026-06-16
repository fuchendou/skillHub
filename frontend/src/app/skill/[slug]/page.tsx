"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CopyInstallButton } from "@/components/CopyInstallButton";
import { ReviewActionLog } from "@/components/ReviewActionLog";
import { SkillActions } from "@/components/SkillActions";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { getSkill } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { role, user } = useAuth();

  const { data: skill, isPending, isError, error, refetch } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => getSkill(slug),
    retry: false,
  });

  if (isPending) {
    return (
      <div className="py-16">
        <Spinner label="Loading skill…" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="py-12">
        <ErrorState
          message={notFound ? "This skill doesn’t exist or isn’t public." : "Failed to load this skill."}
          onRetry={notFound ? undefined : () => refetch()}
        />
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-sky-400 hover:underline">
            ← Back to the catalog
          </Link>
        </div>
      </div>
    );
  }

  const canSeeLog = role === "admin" || user?.id === skill.owner.id;

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Catalog
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {skill.is_featured && <span title="Featured">⭐</span>}
            <h2 className="text-2xl font-semibold text-zinc-100">{skill.name}</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {skill.category.name} · by {skill.owner.display_name}
          </p>
        </div>
        <StatusBadge status={skill.status} />
      </header>

      <p className="text-zinc-300">{skill.summary}</p>

      {skill.tag.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tag.map((t) => (
            <span key={t.id} className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              #{t.slug}
            </span>
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Install</h3>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-200">
            {skill.install_command}
          </code>
          <CopyInstallButton command={skill.install_command} />
        </div>
        <a
          href={externalHref(skill.source_url)}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block text-sm text-sky-400 hover:underline"
        >
          Source / reference ↗
        </a>
      </section>

      {skill.usage_note && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Usage notes</h3>
          <p className="whitespace-pre-wrap text-sm text-zinc-300">{skill.usage_note}</p>
        </section>
      )}

      {skill.status === "rejected" && skill.rejection_reason && (
        <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">Rejection reason</h3>
          <p className="mt-1 text-sm text-zinc-300">{skill.rejection_reason}</p>
        </section>
      )}

      <section className="border-t border-zinc-800 pt-4">
        <SkillActions skill={skill} />
      </section>

      {canSeeLog && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Action history</h3>
          <ReviewActionLog skillId={skill.id} />
        </section>
      )}
    </div>
  );
}
