import Link from "next/link";

import { CopyInstallButton } from "@/components/CopyInstallButton";
import { StatusBadge } from "@/components/StatusBadge";
import type { Skill } from "@/lib/api/types";

export function SkillCard({ skill }: { skill: Skill }) {
  const visibility = skill.departments.length
    ? skill.departments.map((d) => d.name).join(", ")
    : "Org-wide";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {skill.is_featured && <span title="Featured">Featured</span>}
            <Link
              href={`/skill/${skill.slug}`}
              className="truncate text-base font-semibold text-zinc-100 hover:text-sky-300"
            >
              {skill.name}
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {skill.category.name} / {skill.owner.display_name} / {visibility}
          </p>
        </div>
        <StatusBadge status={skill.status} />
      </div>

      <p className="line-clamp-2 text-sm text-zinc-400">{skill.summary}</p>

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((t) => (
            <span key={t.id} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
              #{t.slug}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">
          {skill.install_command}
        </code>
        <CopyInstallButton command={skill.install_command} />
      </div>
    </article>
  );
}
