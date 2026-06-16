"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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

const fieldCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none";

export default function SubmitPage() {
  const { ready, role } = useAuth();
  const toast = useToast();
  const router = useRouter();
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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-100">Submit a skill</h2>
        <p className="text-sm text-zinc-400">
          Sign in before submitting a skill.{" "}
          <Link href="/login" className="text-sky-400 hover:underline">
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
    <div className="max-w-2xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Submit a skill</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Provide the metadata reviewers need. Your submission enters pending review.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Name" error={errors.name?.message}>
          <input className={fieldCls} placeholder="Schema Drift Watcher" {...register("name")} />
        </Field>
        <Field label="Short description" error={errors.summary?.message}>
          <input className={fieldCls} placeholder="One sentence on what it does." {...register("summary")} />
        </Field>
        <Field label="Category" error={errors.category_id?.message}>
          <select className={fieldCls} defaultValue="" {...register("category_id")}>
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
        <Field label="Install command" error={errors.install_command?.message} hint="e.g. codex skill install owner/name">
          <input className={`${fieldCls} font-mono`} placeholder="codex skill install owner/name" {...register("install_command")} />
        </Field>
        <Field label="Source / reference URL" error={errors.source_url?.message}>
          <input className={fieldCls} placeholder="github.com/owner/name" {...register("source_url")} />
        </Field>
        <Field label="Tags" error={errors.tags?.message} hint="Comma-separated">
          <input className={fieldCls} placeholder="database, sql" {...register("tags")} />
        </Field>
        <Field label="Usage notes" error={errors.usage_note?.message}>
          <textarea className={fieldCls} rows={4} placeholder="When and how to use it" {...register("usage_note")} />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </Button>
          <Link href="/my-skills" className="text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="block text-xs text-rose-400">{error}</span>}
    </label>
  );
}
