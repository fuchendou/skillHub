import { request } from "./client";
import type { AuthUser, TokenBundle } from "./types";

export async function login(email: string, password: string): Promise<TokenBundle> {
  const body = await request<{ data: TokenBundle }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return body.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const body = await request<{ data: AuthUser }>("/auth/me", { method: "GET" });
  return body.data;
}
