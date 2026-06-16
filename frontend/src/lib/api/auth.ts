import { request } from "./client";
import type { AuthUser, TokenBundle } from "./types";

export async function login(email: string, password: string): Promise<TokenBundle> {
  const body = await request<{ data: TokenBundle }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return body.data;
}

export async function registerMember(input: {
  email: string;
  password: string;
  display_name: string;
  department_id: string;
}): Promise<AuthUser> {
  const body = await request<{ data: AuthUser }>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
  return body.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const body = await request<{ data: AuthUser }>("/auth/me", { method: "GET" });
  return body.data;
}
