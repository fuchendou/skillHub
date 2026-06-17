"use client";

import { Search, Star, X } from "lucide-react";

import type { Category } from "@/lib/api/types";

export interface FilterState {
  q: string;
  category: string;
  sort: "newest" | "name" | "featured";
  featured: boolean;
}

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
  const hasFilters = state.q || state.category || state.featured || state.sort !== "newest";

  return (
    <section className="surface toolbar">
      <div className="search-row">
        <label className="search-box">
          <Search className="icon" />
          <span className="sr-only">Search skills</span>
          <input
            value={state.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search by skill, tag, owner, or category"
            type="search"
          />
        </label>
        <select
          value={state.sort}
          onChange={(e) => onChange({ sort: e.target.value as FilterState["sort"] })}
          aria-label="Sort"
        >
          <option value="newest">Newest</option>
          <option value="name">Name A-Z</option>
          <option value="featured">Featured first</option>
        </select>
      </div>

      <div className="chip-row">
        <button className={`chip ${state.category === "" ? "active" : ""}`} type="button" onClick={() => onChange({ category: "" })}>
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`chip ${state.category === category.slug ? "active" : ""}`}
            type="button"
            onClick={() => onChange({ category: category.slug })}
          >
            {category.name}
          </button>
        ))}
        <button
          className={`chip ${state.featured ? "on" : ""}`}
          type="button"
          onClick={() => onChange({ featured: !state.featured })}
        >
          <Star className="icon" />
          Featured
        </button>
        {hasFilters && (
          <button className="chip" type="button" onClick={onReset}>
            <X className="icon" />
            Reset
          </button>
        )}
      </div>
    </section>
  );
}
