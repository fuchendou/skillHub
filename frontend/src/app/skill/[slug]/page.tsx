"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Check, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ReviewActionLog } from "@/components/ReviewActionLog";
import { SkillActions } from "@/components/SkillActions";
import {
  CategoryTag,
  CommandBox,
  FeaturedBadge,
  SourceButton,
  TrustBadge,
  visibilityLabel,
} from "@/components/SkillDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { getSkill } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { ready, role, user } = useAuth();

  const { data: skill, isPending, isError, error, refetch } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => getSkill(slug),
    retry: false,
    enabled: !!role,
  });

  if (!ready) return <Spinner label="Loading session..." />;
  if (!role) {
    return <ErrorState message="Sign in to view skill details." />;
  }
  if (isPending) {
    return (
      <div className="py-16">
        <Spinner label="Loading skill..." />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="py-12">
        <ErrorState
          message={notFound ? "This skill does not exist or is not visible to your department." : "Failed to load this skill."}
          onRetry={notFound ? undefined : () => refetch()}
        />
      </div>
    );
  }

  const canSeeLog = role === "admin" || user?.id === skill.owner.id;

  return (
    <div>
      <div className="actions mb-3" style={{ justifyContent: "flex-start" }}>
        <Link href="/" className="btn ghost">
          <ArrowLeft className="icon" />
          Back to catalog
        </Link>
      </div>

      <section className="grid-2">
        <article className="surface-flat">
          <div className="detail-title">
            <div className="badge-row">
              {skill.is_featured && <FeaturedBadge />}
              <StatusBadge status={skill.status} />
              <CategoryTag label={skill.category.name} />
            </div>
            <h2>{skill.name}</h2>
            <p>{skill.summary}</p>
          </div>
          <div className="detail-body">
            <div className="field-grid">
              <div className="field">
                <label>Owner</label>
                <input value={skill.owner.display_name} readOnly />
              </div>
              <div className="field">
                <label>Visibility</label>
                <input value={visibilityLabel(skill)} readOnly />
              </div>
              <div className="field full">
                <label>Source link</label>
                <input value={skill.source_url} readOnly />
              </div>
              <div className="field full">
                <label>Install command</label>
                <input value={skill.install_command} readOnly />
              </div>
              {skill.usage_note && (
                <div className="field full">
                  <label>Usage notes</label>
                  <textarea value={skill.usage_note} readOnly />
                </div>
              )}
            </div>

            {skill.status === "rejected" && skill.rejection_reason && (
              <div className="notice warn mt-4">
                <ExternalLink className="icon" />
                <div>{skill.rejection_reason}</div>
              </div>
            )}
          </div>
        </article>

        <aside className="side-panel sticky-panel">
          <span className="badge info">
            <ShieldCheck className="icon" />
            Trust signals
          </span>
          <h2 className="m-0 text-xl font-black text-slate-900">Install details</h2>
          <CommandBox command={skill.install_command} />
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <SourceButton source={skill.source_url} />
          </div>
          <ul className="check-list">
            <li>
              <span className="check-icon">
                <Check className="icon" />
              </span>
              <span>
                <strong>Command format</strong>
                <br />
                <span className="mini">{skill.install_command}</span>
              </span>
              <span className="badge safe">Passed</span>
            </li>
            <li>
              <span className="check-icon">
                <ShieldCheck className="icon" />
              </span>
              <span>
                <strong>Review trust</strong>
                <br />
                <span className="mini">Published records are reviewed before catalog access.</span>
              </span>
              <TrustBadge />
            </li>
            <li>
              <span className="check-icon">
                <Building2 className="icon" />
              </span>
              <span>
                <strong>Visibility</strong>
                <br />
                <span className="mini">{visibilityLabel(skill)}</span>
              </span>
            </li>
          </ul>
          <SkillActions skill={skill} />
        </aside>
      </section>

      {canSeeLog && (
        <section className="surface-flat mt-4 p-4">
          <h3 className="mb-3 text-xs font-black uppercase text-slate-500">Action history</h3>
          <ReviewActionLog skillId={skill.id} />
        </section>
      )}
    </div>
  );
}
