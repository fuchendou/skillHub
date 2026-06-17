"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CatalogFilters, type FilterState } from "@/components/CatalogFilters";
import { SkillRow } from "@/components/SkillDisplay";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { listCategories } from "@/lib/api/catalog";
import { listSkills } from "@/lib/api/skills";
import { useAuth } from "@/lib/auth/AuthProvider";

const DEFAULT_FILTERS: FilterState = { q: "", category: "", sort: "newest", featured: false };

export default function CatalogPage() {
  const router = useRouter();
  const { ready, role, user } = useAuth();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    if (ready && !role) router.replace("/login");
  }, [ready, role, router]);

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

  if (!ready || !role) {
    return <Spinner label="Loading catalog..." />;
  }

  const scope =
    role === "admin"
      ? "All departments"
      : user?.department
        ? `Visible to ${user.department.name} or org-wide`
        : "Visible to your department or org-wide";

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>{role === "admin" ? "Catalog preview" : "Skill catalog"}</h1>
          <p>
            {role === "admin"
              ? "All published skills across departments, with current visibility and curation state."
              : "Published skills available to your department, with source and install details ready to inspect."}
          </p>
        </div>
        <div className="scope-pill">
          <Building2 className="icon" />
          {role === "admin" ? "All departments" : `${user?.department?.name ?? "Member"} catalog`}
        </div>
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
          title="No skills match"
          hint="Try a different search or category."
          actionLabel="Reset filters"
          onAction={reset}
        />
      ) : (
        <>
          <div className="result-meta">
            <span>
              {skills.data.data.length} of {skills.data.pagination.total} published skills
            </span>
            <span>{scope}</span>
          </div>
          <section className="surface list">
            {skills.data.data.map((skill) => (
              <SkillRow key={skill.id} skill={skill} href={`/skill/${skill.slug}`} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
