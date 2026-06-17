"use client";

import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, Clock3, FileSearch, Layers, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CategoryTag, EvidenceBadge, RiskBadge, visibilityLabel } from "@/components/SkillDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listSkills } from "@/lib/api/skills";
import type { Skill, SkillStatus } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const FILTERS: { key: SkillStatus | "all"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "pending", label: "Pending", icon: Clock3 },
  { key: "rejected", label: "Rejected", icon: XCircle },
  { key: "unpublished", label: "Unpublished", icon: Archive },
  { key: "published", label: "Published", icon: CheckCircle2 },
  { key: "all", label: "All", icon: Layers },
];

function countBy(skills: Skill[], status: SkillStatus) {
  return skills.filter((skill) => skill.status === status).length;
}

export default function ReviewPage() {
  const { ready, role } = useAuth();
  const [filter, setFilter] = useState<SkillStatus | "all">("pending");

  const query = useQuery({
    queryKey: ["skills", "review", "all"],
    queryFn: () => listSkills({ status: "all", sort: "newest", limit: 100 }),
    enabled: role === "admin",
  });

  if (!ready) return <Spinner label="Loading session..." />;

  if (role !== "admin") {
    return (
      <div className="surface-flat p-6">
        <h1 className="text-2xl font-black text-slate-900">Review queue</h1>
        <p className="mt-1 text-sm text-slate-500">Admin access is required.</p>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="py-16">
        <Spinner label="Loading review queue..." />
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState message="Could not load the queue." onRetry={() => query.refetch()} />;
  }

  const all = query.data.data;
  const rows = filter === "all" ? all : all.filter((skill) => skill.status === filter);
  const pending = countBy(all, "pending");
  const flagged = all.filter((skill) => skill.status === "pending" && /duplicate|source|needs|review/i.test(skill.risk_label ?? "")).length;
  const published = countBy(all, "published");
  const restorable = countBy(all, "unpublished");

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Review queue</h1>
          <p>Pending submissions grouped by risk, ready for evidence review before a decision.</p>
        </div>
        <div className="scope-pill">
          <Clock3 className="icon" />
          {pending} pending
        </div>
      </header>

      <section className="summary-strip">
        <div className="metric">
          <strong>{pending}</strong>
          <span>pending review</span>
        </div>
        <div className="metric">
          <strong>{flagged}</strong>
          <span>need deeper check</span>
        </div>
        <div className="metric">
          <strong>{published}</strong>
          <span>published live</span>
        </div>
        <div className="metric">
          <strong>{restorable}</strong>
          <span>restorable</span>
        </div>
      </section>

      <section className="surface">
        <div className="section-head">
          <div>
            <h2>Submissions</h2>
            <p>Open each record to inspect checks, source, and scope before deciding.</p>
          </div>
        </div>
        <div className="toolbar" style={{ margin: 0, borderBottom: "1px solid var(--line)", boxShadow: "none" }}>
          <div className="chip-row wrap">
            {FILTERS.map((item) => {
              const Icon = item.icon;
              const count = item.key === "all" ? all.length : countBy(all, item.key);
              return (
                <button
                  key={item.key}
                  className={`chip ${filter === item.key ? "active" : ""}`}
                  type="button"
                  onClick={() => setFilter(item.key)}
                >
                  <Icon className="icon" />
                  {item.label} {count}
                </button>
              );
            })}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nothing here" hint="Switch filters to review another lifecycle state." />
          </div>
        ) : (
          <div className="list">
            {rows.map((skill) => (
              <article key={skill.id} className="list-row compact">
                <div className="row-main">
                  <div className="badge-row">
                    <StatusBadge status={skill.status} />
                    <RiskBadge skill={skill} />
                    <CategoryTag label={skill.category.name} />
                  </div>
                  <h3>{skill.name}</h3>
                  <p>{skill.summary}</p>
                </div>
                <div className="stack tight">
                  <span className="mini">Submitter</span>
                  <strong>{skill.owner.display_name}</strong>
                </div>
                <div className="stack tight">
                  <span className="mini">Evidence</span>
                  <EvidenceBadge skill={skill} />
                </div>
                <div className="stack tight scope-col">
                  <span className="mini">Scope</span>
                  <strong>{visibilityLabel(skill)}</strong>
                </div>
                <div className="actions">
                  <Link href={`/review/${skill.id}`} className="btn primary small">
                    <FileSearch className="icon" />
                    Review
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
