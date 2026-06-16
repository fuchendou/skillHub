// Typed fetch client mirroring api.md: attaches the bearer token, unwraps the
// { data } / { error } envelope, and transparently refreshes on TOKEN_EXPIRED (implement.md §5.4).
import { tokenStore } from "@/lib/auth/store";
import type { ApiErrorBody, TokenBundle } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  code: string;
  details: { field?: string; message: string }[];
  status: number;

  constructor(body: Partial<ApiErrorBody>, status: number) {
    super(body?.message ?? "Request failed.");
    this.code = body?.code ?? "UNKNOWN";
    this.details = body?.details ?? [];
    this.status = status;
  }
}

interface Options extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
  auth?: boolean;
}

async function tryRefresh(): Promise<boolean> {
  const rt = tokenStore.refresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    const body = (await res.json()) as { data: TokenBundle };
    tokenStore.set(body.data);
    return true;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, opts: Options = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = opts.auth === false ? null : tokenStore.access();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body?.error ?? {}) as Partial<ApiErrorBody>;
    if (err.code === "TOKEN_EXPIRED" && retry && (await tryRefresh())) {
      return request<T>(path, opts, false);
    }
    throw new ApiError(err, res.status);
  }
  return body as T;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
