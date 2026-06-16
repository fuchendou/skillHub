"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CatalogFilters, type FilterState } from "@/components/CatalogFilters";
import { SkillCard } from "@/components/SkillCard";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listCategories } from "@/lib/api/catalog";
import { listSkills } from "@/lib/api/skills";

const DEFAULT_FILTERS: FilterState = { q: "", category: "", sort: "newest", featured: false };

export default function CatalogPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const skills = useQuery({
    queryKey: ["skills", "catalog", filters],
    queryFn: () =>
      listSkills({
        q: filters.q || undefined,
        category: filters.category || undefined,
        featured: filters.featured || undefined,
        sort: filters.sort,
      }),
  });

  const onChange = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Catalog</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Browse published skills. Search by keyword, filter by category, or show featured picks.
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
          <Spinner label="Loading catalog…" />
        </div>
      ) : skills.isError ? (
        <ErrorState
          message="The catalog could not be loaded. Is the backend running?"
          onRetry={() => skills.refetch()}
        />
      ) : skills.data.data.length === 0 ? (
        <EmptyState
          title="No skills match your filters"
          hint="Try a different keyword or category, or clear the filters to see everything."
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
