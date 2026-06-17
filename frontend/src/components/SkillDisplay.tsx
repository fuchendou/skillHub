import {
  AlertTriangle,
  Building2,
  Check,
  ExternalLink,
  FileText,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";

import { CopyInstallButton } from "@/components/CopyInstallButton";
import type { Skill } from "@/lib/api/types";

export function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function visibilityLabel(skill: Pick<Skill, "departments">): string {
  return skill.departments.length ? skill.departments.map((d) => d.name).join(", ") : "Org-wide";
}

export function riskTone(skill: Pick<Skill, "risk_label" | "status">): "safe" | "warn" | "danger" | "neutral" {
  const value = (skill.risk_label ?? "").toLowerCase();
  if (skill.status === "draft") return "neutral";
  if (/duplicate|needs|review|source|failed|high/.test(value)) return "warn";
  if (/block|invalid|critical/.test(value)) return "danger";
  if (/low|clear|safe/.test(value)) return "safe";
  return "neutral";
}

export function RiskBadge({ skill }: { skill: Pick<Skill, "risk_label" | "status"> }) {
  const tone = riskTone(skill);
  const label = skill.risk_label || (skill.status === "draft" ? "Draft" : "Low risk");
  const Icon = tone === "warn" ? AlertTriangle : tone === "danger" ? X : ShieldCheck;
  return (
    <span className={`badge ${tone === "neutral" ? "neutral" : tone}`}>
      <Icon className="icon" />
      {label}
    </span>
  );
}

export function CategoryTag({ label }: { label: string }) {
  return <span className="tag">{label}</span>;
}

export function FeaturedBadge() {
  return (
    <span className="badge featured">
      <Star className="icon" />
      Featured
    </span>
  );
}

export function TrustBadge() {
  return (
    <span className="badge safe">
      <ShieldCheck className="icon" />
      Reviewed
    </span>
  );
}

export function EvidenceBadge({ skill }: { skill: Pick<Skill, "risk_label" | "status"> }) {
  const warn = riskTone(skill) === "warn" || riskTone(skill) === "danger";
  return (
    <span className={`badge ${warn ? "pending" : "safe"}`}>
      {warn ? <AlertTriangle className="icon" /> : <Check className="icon" />}
      {warn ? "Needs check" : "Checks pass"}
    </span>
  );
}

export function SourceButton({ source }: { source: string }) {
  return (
    <a href={externalHref(source)} target="_blank" rel="noreferrer noopener" className="btn ghost small">
      <ExternalLink className="icon" />
      Source
    </a>
  );
}

export function CommandBox({ command, copyLabel = "Copy install" }: { command: string; copyLabel?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="cmd min-w-0 flex-1">{command}</div>
      <CopyInstallButton command={command} label={copyLabel} compact />
    </div>
  );
}

export function SkillRow({ skill, href, actionLabel = "Open" }: { skill: Skill; href: string; actionLabel?: string }) {
  return (
    <article className="list-row">
      <div className="row-main">
        <div className="badge-row">
          {skill.is_featured && <FeaturedBadge />}
          <CategoryTag label={skill.category.name} />
        </div>
        <h3>{skill.name}</h3>
        <p>{skill.summary}</p>
      </div>
      <div className="stack tight">
        <span className="mini">Owner</span>
        <strong>{skill.owner.display_name}</strong>
      </div>
      <div className="stack tight">
        <span className="mini">Trust</span>
        <TrustBadge />
      </div>
      <div className="stack tight scope-col">
        <span className="mini">Available to</span>
        <strong>{visibilityLabel(skill)}</strong>
      </div>
      <div className="actions">
        <Link href={href} className="btn secondary small">
          <FileText className="icon" />
          {actionLabel}
        </Link>
        <CopyInstallButton command={skill.install_command} compact />
      </div>
    </article>
  );
}

export function VisibilitySummary({ skill }: { skill: Pick<Skill, "departments"> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Building2 className="icon" />
      {visibilityLabel(skill)}
    </span>
  );
}
