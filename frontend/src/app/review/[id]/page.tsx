"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  Gavel,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ReviewActionLog } from "@/components/ReviewActionLog";
import { SkillActions } from "@/components/SkillActions";
import {
  CategoryTag,
  CommandBox,
  RiskBadge,
  SourceButton,
  visibilityLabel,
} from "@/components/SkillDisplay";
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
    return <p className="surface-flat p-6 text-sm text-slate-500">Admin access is required.</p>;
  }
  if (isPending) {
    return (
      <div className="py-16">
        <Spinner label="Loading submission..." />
      </div>
    );
  }
  if (isError) {
    return <ErrorState message="Could not load this submission." onRetry={() => refetch()} />;
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Review submission</h1>
          <p>Submitted metadata, automated checks, visibility impact, and final decision controls.</p>
        </div>
      </header>

      <div className="actions mb-3" style={{ justifyContent: "flex-start" }}>
        <Link href="/review" className="btn ghost">
          <ArrowLeft className="icon" />
          Back
        </Link>
      </div>

      <section className="grid-2">
        <article className="surface-flat">
          <div className="detail-title">
            <div className="badge-row">
              <StatusBadge status={skill.status} />
              <RiskBadge skill={skill} />
              <CategoryTag label={skill.category.name} />
            </div>
            <h2>{skill.name}</h2>
            <p>{skill.summary}</p>
          </div>
          <div className="detail-body">
            <div className="field-grid">
              <div className="field">
                <label>Submitter</label>
                <input value={skill.owner.display_name} readOnly />
              </div>
              <div className="field">
                <label>Updated</label>
                <input value={new Date(skill.updated_at).toLocaleString()} readOnly />
              </div>
              <div className="field full">
                <label>Source link</label>
                <input value={skill.source_url} readOnly />
              </div>
              <div className="field full">
                <label>Install command</label>
                <input value={skill.install_command} readOnly />
              </div>
              <div className="field full">
                <label>Usage notes</label>
                <textarea value={skill.usage_note ?? "No usage notes provided."} readOnly />
              </div>
              {skill.rejection_reason && (
                <div className="notice warn field full">
                  <AlertTriangle className="icon" />
                  <div>{skill.rejection_reason}</div>
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="side-panel sticky-panel">
          <span className="badge info">
            <Gavel className="icon" />
            Decision
          </span>
          <h2 className="m-0 text-xl font-black text-slate-900">Review evidence</h2>
          <CommandBox command={skill.install_command} copyLabel="Copy" />
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <SourceButton source={skill.source_url} />
          </div>
          <ReviewEvidence skill={skill} />
          <SkillActions skill={skill} />
          <DepartmentAssignment skill={skill} />
        </aside>
      </section>

      <section className="surface-flat mt-4 p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-slate-500">Action history</h3>
        <ReviewActionLog skillId={skill.id} />
      </section>
    </div>
  );
}

function ReviewEvidence({ skill }: { skill: Skill }) {
  const duplicateWarn = /duplicate/i.test(skill.risk_label ?? "");
  const sourceWarn = /source|mirror|unverified/i.test(`${skill.risk_label ?? ""} ${skill.rejection_reason ?? ""}`);
  return (
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
        <span className={`check-icon ${sourceWarn ? "warn" : ""}`}>
          {sourceWarn ? <AlertTriangle className="icon" /> : <Check className="icon" />}
        </span>
        <span>
          <strong>Source link</strong>
          <br />
          <span className="mini">{skill.source_url}</span>
        </span>
        <span className={`badge ${sourceWarn ? "pending" : "safe"}`}>{sourceWarn ? "Review" : "Verified"}</span>
      </li>
      <li>
        <span className={`check-icon ${duplicateWarn ? "warn" : ""}`}>
          {duplicateWarn ? <AlertTriangle className="icon" /> : <Check className="icon" />}
        </span>
        <span>
          <strong>Duplicate check</strong>
          <br />
          <span className="mini">{duplicateWarn ? "Potential overlap flagged by risk label." : "No catalog duplicate found."}</span>
        </span>
        <span className={`badge ${duplicateWarn ? "pending" : "safe"}`}>{duplicateWarn ? "Check" : "Clear"}</span>
      </li>
      <li>
        <span className="check-icon">
          <Building2 className="icon" />
        </span>
        <span>
          <strong>Visibility impact</strong>
          <br />
          <span className="mini">{visibilityLabel(skill)}</span>
        </span>
      </li>
    </ul>
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
    return (
      <div className="notice warn">
        <AlertTriangle className="icon" />
        <div>Department assignment becomes active after publish.</div>
      </div>
    );
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

  if (departments.isPending) return <Spinner label="Loading departments..." />;
  if (departments.isError) return <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />;

  return (
    <div className="stack">
      <div>
        <strong>Department visibility</strong>
        <div className="mini">
          {selected.length === 0 ? "Org-wide. Add a department to scope access." : "Visible to selected departments."}
        </div>
      </div>
      <div className="chip-row wrap">
        {departments.data.map((department) => {
          const active = selected.includes(department.id);
          return (
            <button
              key={department.id}
              className={`chip ${active ? "on" : ""}`}
              type="button"
              onClick={() =>
                setSelected((current) =>
                  active ? current.filter((id) => id !== department.id) : [...current, department.id],
                )
              }
            >
              {active ? <Check className="icon" /> : <Plus className="icon" />}
              {department.name}
            </button>
          );
        })}
      </div>
      <Button onClick={save} disabled={busy} variant="secondary">
        <ShieldCheck className="icon" />
        {busy ? "Saving" : "Save visibility"}
      </Button>
    </div>
  );
}
