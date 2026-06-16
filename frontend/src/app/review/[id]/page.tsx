"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CopyInstallButton } from "@/components/CopyInstallButton";
import { ReviewActionLog } from "@/components/ReviewActionLog";
import { SkillActions } from "@/components/SkillActions";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ErrorState, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toaster";
import { listDepartments } from "@/lib/api/catalog";
import { assignSkillDepartments, getSkill } from "@/lib/api/skills";
import type { Skill } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, role } = useAuth();

  const { data: skill, isPending, isError, refetch } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => getSkill(id),
    enabled: role === "admin",
    retry: false,
  });

  if (!ready) return <Spinner label="Loading session..." />;
  if (role !== "admin") {
    return <p className="text-sm text-zinc-400">Admin access is required.</p>;
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
        Review queue
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">{skill.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {skill.category.name} / {skill.owner.display_name}
            {skill.risk_label ? ` / ${skill.risk_label}` : ""}
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
          <h3 className="text-xs font-semibold uppercase text-zinc-500">Usage notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{skill.usage_note}</p>
        </section>
      )}

      {skill.rejection_reason && (
        <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase text-rose-300">Rejection reason</h3>
          <p className="mt-1 text-sm text-zinc-300">{skill.rejection_reason}</p>
        </section>
      )}

      <section className="border-t border-zinc-800 pt-4">
        <SkillActions skill={skill} />
      </section>

      <DepartmentAssignment skill={skill} />

      <section className="space-y-3 border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-semibold uppercase text-zinc-500">Action history</h3>
        <ReviewActionLog skillId={skill.id} />
      </section>
    </div>
  );
}

function DepartmentAssignment({ skill }: { skill: Skill }) {
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(skill.departments.map((d) => d.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(skill.departments.map((d) => d.id));
  }, [skill]);

  if (skill.status !== "published") {
    return null;
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await assignSkillDepartments(skill.id, selected);
      await queryClient.invalidateQueries();
      toast("success", "Visibility updated.");
    } catch {
      toast("error", "Could not update visibility.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <h3 className="text-xs font-semibold uppercase text-zinc-500">Department visibility</h3>
      {departments.isPending ? (
        <Spinner label="Loading departments..." />
      ) : departments.isError ? (
        <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {departments.data.map((department) => {
              const checked = selected.includes(department.id);
              return (
                <label key={department.id} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, department.id]
                          : current.filter((id) => id !== department.id),
                      )
                    }
                    className="h-4 w-4 accent-sky-500"
                  />
                  {department.name}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">No checked departments means org-wide.</p>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save visibility"}
          </Button>
        </>
      )}
    </section>
  );
}
