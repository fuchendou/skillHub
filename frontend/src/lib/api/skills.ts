import { newIdempotencyKey, request } from "./client";
import type { Paginated, ReviewAction, Skill } from "./types";

export interface SkillQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  sort?: "newest" | "name" | "featured";
  status?: string;
  owner?: string;
}

export interface SkillInput {
  name: string;
  summary: string;
  category_id: string;
  install_command: string;
  source_url: string;
  tag: string[];
  usage_note?: string;
}

function toQuery(query: SkillQuery): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function listSkills(query: SkillQuery = {}): Promise<Paginated<Skill>> {
  return request<Paginated<Skill>>(`/skill${toQuery(query)}`, { method: "GET" });
}

export async function getSkill(idOrSlug: string): Promise<Skill> {
  const body = await request<{ data: Skill }>(`/skill/${idOrSlug}`, { method: "GET" });
  return body.data;
}

export async function createSkill(input: SkillInput): Promise<Skill> {
  const body = await request<{ data: Skill }>("/skill", {
    method: "POST",
    body: input,
    idempotencyKey: newIdempotencyKey(),
  });
  return body.data;
}

export async function updateSkill(id: string, input: Partial<SkillInput>): Promise<Skill> {
  const body = await request<{ data: Skill }>(`/skill/${id}`, { method: "PATCH", body: input });
  return body.data;
}

// --- Lifecycle actions (each carries a fresh Idempotency-Key, api.md §4) ---
async function action(id: string, verb: string, method = "POST", body?: unknown): Promise<Skill> {
  const res = await request<{ data: Skill }>(`/skill/${id}/${verb}`, {
    method,
    body,
    idempotencyKey: newIdempotencyKey(),
  });
  return res.data;
}

export const publishSkill = (id: string) => action(id, "publish");
export const unpublishSkill = (id: string) => action(id, "unpublish");
export const featureSkill = (id: string) => action(id, "feature");
export const unfeatureSkill = (id: string) => action(id, "feature", "DELETE");
export const resubmitSkill = (id: string) => action(id, "resubmit");
export const rejectSkill = (id: string, reason: string) => action(id, "reject", "POST", { reason });

export async function reviewActions(id: string): Promise<ReviewAction[]> {
  const body = await request<Paginated<ReviewAction>>(`/skill/${id}/review-action`, { method: "GET" });
  return body.data;
}
