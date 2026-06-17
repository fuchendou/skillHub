"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { Spinner } from "@/components/ui";
import { reviewActions } from "@/lib/api/skills";

export function ReviewActionLog({ skillId }: { skillId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["review-action", skillId],
    queryFn: () => reviewActions(skillId),
  });

  if (isPending) return <Spinner label="Loading history..." />;
  if (isError) return <p className="text-sm text-red-700">Could not load the action history.</p>;
  if (data.length === 0) return <p className="text-sm text-slate-500">No actions recorded yet.</p>;

  return (
    <ol className="grid gap-2">
      {data.map((a) => (
        <li key={a.id} className="surface-flat flex items-start justify-between gap-3 p-3">
          <div className="flex min-w-0 gap-3">
            <span className="check-icon">
              <History className="icon" />
            </span>
            <div className="min-w-0">
              <span className="text-sm font-bold capitalize text-slate-900">{a.action}</span>
              {a.from_status && (
                <span className="text-xs text-slate-500">
                  {" "}
                  / {a.from_status} to {a.to_status}
                </span>
              )}
              {a.reason && <p className="mt-0.5 text-xs italic text-slate-500">"{a.reason}"</p>}
            </div>
          </div>
          <div className="shrink-0 text-right text-[11px] text-slate-500">
            <div>{a.actor?.display_name ?? "-"}</div>
            <div>{new Date(a.created_at).toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
