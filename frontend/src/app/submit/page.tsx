"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Route, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useToast } from "@/components/Toaster";
import { Button, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { listCategories } from "@/lib/api/catalog";
import { createSkill } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";
import { skillSubmitSchema, type SkillFormValues } from "@/lib/validation/skill";

export default function SubmitPage() {
  const { ready, role } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories, enabled: !!role });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkillFormValues>({ resolver: zodResolver(skillSubmitSchema) });

  if (!ready) return <Spinner label="Loading session..." />;

  if (!role) {
    return (
      <div className="surface-flat p-6">
        <h1 className="text-2xl font-black text-slate-900">Submit a skill</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in before submitting a skill.{" "}
          <Link href="/login" className="font-bold text-teal-700 hover:text-teal-900">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(values: SkillFormValues) {
    const tags = (values.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const skill = await createSkill({
        name: values.name,
        summary: values.summary,
        category_id: values.category_id,
        install_command: values.install_command,
        source_url: values.source_url,
        usage_note: values.usage_note || undefined,
        tags,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["skills", "mine"] }),
        queryClient.invalidateQueries({ queryKey: ["nav", "mine"] }),
      ]);
      toast("success", `${skill.name} submitted for review.`);
      router.push("/my-skills");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.details.length) {
          e.details.forEach((d) => d.field && setError(d.field as keyof SkillFormValues, { message: d.message }));
        } else if (e.code === "DUPLICATE_SKILL_NAME") {
          setError("name", { message: "A skill with this name already exists." });
        } else if (e.code === "DUPLICATE_SOURCE_URL") {
          setError("source_url", { message: "This source link is already in use." });
        } else if (e.code === "INVALID_INSTALL_COMMAND") {
          setError("install_command", { message: e.message });
        } else {
          toast("error", e.message);
        }
      } else {
        toast("error", "Submission failed.");
      }
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Submit a skill</h1>
          <p>Provide the metadata reviewers need before a skill can be published.</p>
        </div>
      </header>

      <section className="grid-2">
        <form onSubmit={handleSubmit(onSubmit)} className="surface-flat detail-body" noValidate>
          <div className="field-grid">
            <Field label="Name" error={errors.name?.message}>
              <input placeholder="Schema Drift Watcher" {...register("name")} />
            </Field>
            <Field label="Category" error={errors.category_id?.message}>
              <select defaultValue="" {...register("category_id")}>
                <option value="" disabled>
                  Choose a category
                </option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Short description" error={errors.summary?.message} full>
              <input placeholder="One sentence on what it does." {...register("summary")} />
            </Field>
            <Field label="Install command" error={errors.install_command?.message} hint="e.g. codex skill install owner/name" full>
              <input className="font-mono" placeholder="codex skill install owner/name" {...register("install_command")} />
            </Field>
            <Field label="Source / reference URL" error={errors.source_url?.message} full>
              <input placeholder="github.com/owner/name" {...register("source_url")} />
            </Field>
            <Field label="Tags" error={errors.tags?.message} hint="Comma-separated" full>
              <input placeholder="database, sql" {...register("tags")} />
            </Field>
            <Field label="Usage notes" error={errors.usage_note?.message} full>
              <textarea placeholder="When and how to use it" {...register("usage_note")} />
            </Field>
          </div>

          <div className="actions mt-5" style={{ justifyContent: "flex-start" }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <Send className="icon" />
              {isSubmitting ? "Submitting" : "Submit for review"}
            </Button>
            <Link href="/my-skills" className="btn ghost">
              Cancel
            </Link>
          </div>
        </form>

        <aside className="side-panel">
          <span className="badge info">
            <Route className="icon" />
            Review path
          </span>
          <h2 className="m-0 text-xl font-black text-slate-900">What happens next</h2>
          <ul className="check-list">
            <li>
              <span className="check-icon">
                <Send className="icon" />
              </span>
              <span>
                <strong>Pending review</strong>
                <br />
                <span className="mini">Only you and admins can see the submitted record.</span>
              </span>
            </li>
            <li>
              <span className="check-icon">
                <CheckCircle2 className="icon" />
              </span>
              <span>
                <strong>Evidence check</strong>
                <br />
                <span className="mini">Reviewers inspect command format, source, duplicates, and visibility.</span>
              </span>
            </li>
            <li>
              <span className="check-icon">
                <Route className="icon" />
              </span>
              <span>
                <strong>Catalog scope</strong>
                <br />
                <span className="mini">Published skills can be org-wide or limited to departments.</span>
              </span>
            </li>
          </ul>
        </aside>
      </section>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}
