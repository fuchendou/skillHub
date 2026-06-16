"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CopyInstallButton } from "@/components/CopyInstallButton";
import { ReviewActionLog } from "@/components/ReviewActionLog";
import { SkillActions } from "@/components/SkillActions";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Spinner } from "@/components/ui";
import { getSkill } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();

  const { data: skill, isPending, isError, refetch } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => getSkill(id),
    enabled: role === "admin",
    retry: false,
  });

  if (role !== "admin") {
    return <p className="text-sm text-zinc-400">Admins only. Switch to the Admin role in the sidebar.</p>;
  }
  if (isPending) {
    return (
      <div className="py-16">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return <ErrorState message="Could not load this submission." onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <Link href="/review" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Review queue
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">{skill.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {skill.category.name} · by {skill.owner.display_name}
            {skill.risk_label ? ` · ${skill.risk_label}` : ""}
          </p>
        </div>
        <StatusBadge status={skill.status} />
      </header>

      <p className="text-zinc-300">{skill.summary}</p>

      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-200">{skill.install_command}</code>
        <CopyInstallButton command={skill.install_command} />
      </div>
      <p className="text-sm text-zinc-500">
        Source: <span className="text-zinc-300">{skill.source_url}</span>
      </p>

      {skill.usage_note && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Usage notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{skill.usage_note}</p>
        </section>
      )}

      {skill.rejection_reason && (
        <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">Rejection reason</h3>
          <p className="mt-1 text-sm text-zinc-300">{skill.rejection_reason}</p>
        </section>
      )}

      <section className="border-t border-zinc-800 pt-4">
        <SkillActions skill={skill} />
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Action history</h3>
        <ReviewActionLog skillId={skill.id} />
      </section>
    </div>
  );
}
