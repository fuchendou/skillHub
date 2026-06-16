"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CatalogFilters, type FilterState } from "@/components/CatalogFilters";
import { SkillCard } from "@/components/SkillCard";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listCategories } from "@/lib/api/catalog";
import { listSkills } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

const DEFAULT_FILTERS: FilterState = { q: "", category: "", sort: "newest", featured: false };

export default function CatalogPage() {
  const { ready, role, user } = useAuth();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const enabled = ready && !!role;
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories, enabled });
  const skills = useQuery({
    queryKey: ["skills", "catalog", filters],
    queryFn: () =>
      listSkills({
        q: filters.q || undefined,
        category: filters.category || undefined,
        featured: filters.featured || undefined,
        sort: filters.sort,
      }),
    enabled,
  });

  const onChange = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  if (!ready) {
    return <Spinner label="Loading session..." />;
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-zinc-100">Skill Hub</h2>
        <p className="text-sm text-zinc-400">Sign in to browse the internal skill catalog.</p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white">
            Sign in
          </Link>
          <Link href="/register" className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200">
            Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Catalog</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {user?.department ? `Showing skills available to ${user.department.name}.` : "Showing the admin catalog."}
        </p>
      </header>

      <CatalogFilters
        state={filters}
        categories={categories.data ?? []}
        onChange={onChange}
        onReset={reset}
      />

      {skills.isPending ? (
        <div className="py-16">
          <Spinner label="Loading catalog..." />
        </div>
      ) : skills.isError ? (
        <ErrorState message="The catalog could not be loaded." onRetry={() => skills.refetch()} />
      ) : skills.data.data.length === 0 ? (
        <EmptyState
          title="No skills match your filters"
          hint="Try a different keyword or category, or clear the filters."
          actionLabel="Reset filters"
          onAction={reset}
        />
      ) : (
        <>
          <p className="text-xs text-zinc-500">{skills.data.pagination.total} skill(s)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.data.data.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
