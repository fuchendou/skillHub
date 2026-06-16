"use client";

import type { Category } from "@/lib/api/types";

export interface FilterState {
  q: string;
  category: string;
  sort: "newest" | "name" | "featured";
  featured: boolean;
}

const inputCls =
  "rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none";

export function CatalogFilters({
  state,
  categories,
  onChange,
  onReset,
}: {
  state: FilterState;
  categories: Category[];
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={state.q}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Search skills…"
        className={`${inputCls} min-w-[200px] flex-1`}
        aria-label="Search skills"
      />
      <select
        value={state.category}
        onChange={(e) => onChange({ category: e.target.value })}
        className={inputCls}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={state.sort}
        onChange={(e) => onChange({ sort: e.target.value as FilterState["sort"] })}
        className={inputCls}
        aria-label="Sort"
      >
        <option value="newest">Newest</option>
        <option value="name">Name</option>
        <option value="featured">Featured first</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={state.featured}
          onChange={(e) => onChange({ featured: e.target.checked })}
          className="h-4 w-4 accent-sky-500"
        />
        Featured only
      </label>
      <button onClick={onReset} className="text-sm text-zinc-400 underline-offset-2 hover:underline">
        Reset
      </button>
    </div>
  );
}
