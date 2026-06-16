"use client";

import { useQuery } from "@tanstack/react-query";

import { Spinner } from "@/components/ui";
import { reviewActions } from "@/lib/api/skills";

export function ReviewActionLog({ skillId }: { skillId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["review-action", skillId],
    queryFn: () => reviewActions(skillId),
  });

  if (isPending) return <Spinner label="Loading history…" />;
  if (isError) return <p className="text-sm text-rose-300">Couldn&apos;t load the action history.</p>;
  if (data.length === 0) return <p className="text-sm text-zinc-500">No actions recorded yet.</p>;

  return (
    <ol className="space-y-2">
      {data.map((a) => (
        <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
          <div className="min-w-0">
            <span className="text-sm font-medium capitalize text-zinc-200">{a.action}</span>
            {a.from_status && (
              <span className="text-xs text-zinc-500">
                {" "}
                · {a.from_status} → {a.to_status}
              </span>
            )}
            {a.reason && <p className="mt-0.5 text-xs italic text-zinc-500">“{a.reason}”</p>}
          </div>
          <div className="shrink-0 text-right text-[11px] text-zinc-500">
            <div>{a.actor?.display_name ?? "—"}</div>
            <div>{new Date(a.created_at).toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
