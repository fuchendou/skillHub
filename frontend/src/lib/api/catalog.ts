import { request } from "./client";
import type { Category, Paginated, Tag } from "./types";

export async function listCategories(): Promise<Category[]> {
  const body = await request<Paginated<Category>>("/category?limit=100", { method: "GET" });
  return body.data;
}

export async function listTags(q?: string): Promise<Tag[]> {
  const qs = q ? `?limit=100&q=${encodeURIComponent(q)}` : "?limit=100";
  const body = await request<Paginated<Tag>>(`/tag${qs}`, { method: "GET" });
  return body.data;
}
