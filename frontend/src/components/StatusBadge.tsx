import { Archive, CheckCircle2, Clock3, FileEdit, XCircle } from "lucide-react";

import type { SkillStatus } from "@/lib/api/types";

const LABELS: Record<SkillStatus, string> = {
  published: "Published",
  pending: "Pending",
  rejected: "Rejected",
  draft: "Draft",
  unpublished: "Unpublished",
};

const STYLES: Record<SkillStatus, string> = {
  published: "safe",
  pending: "pending",
  rejected: "blocked",
  draft: "neutral",
  unpublished: "neutral",
};

const ICONS = {
  published: CheckCircle2,
  pending: Clock3,
  rejected: XCircle,
  draft: FileEdit,
  unpublished: Archive,
};

export function StatusBadge({ status }: { status: SkillStatus }) {
  const Icon = ICONS[status];
  return (
    <span className={`badge ${STYLES[status]}`}>
      <Icon className="icon" />
      {LABELS[status]}
    </span>
  );
}
