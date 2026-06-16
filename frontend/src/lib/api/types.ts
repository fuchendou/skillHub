// TypeScript mirror of the api.md response shapes.

export type Role = "visitor" | "creator" | "admin";
export type SkillStatus = "draft" | "pending" | "published" | "rejected" | "unpublished";

export interface Ref {
  id: string;
  name: string;
  slug: string;
}

export interface UserRef {
  id: string;
  display_name: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: SkillStatus;
  is_featured: boolean;
  install_command: string;
  source_url: string;
  usage_note: string | null;
  risk_label: string | null;
  rejection_reason: string | null;
  category: Ref;
  owner: UserRef;
  tag: Ref[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ReviewAction {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  actor: UserRef | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  display_name: string;
  role: Exclude<Role, "visitor">;
  email?: string;
}

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: { field?: string; message: string }[];
}
