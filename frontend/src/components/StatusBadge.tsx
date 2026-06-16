import clsx from "clsx";

import type { SkillStatus } from "@/lib/api/types";

const STYLES: Record<SkillStatus, string> = {
  published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  draft: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  unpublished: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};

export function StatusBadge({ status }: { status: SkillStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
