import { request } from "./client";
import type { Department, Paginated, Role, UserAdmin } from "./types";

export async function createDepartment(name: string): Promise<Department> {
  const body = await request<{ data: Department }>("/department", {
    method: "POST",
    body: { name },
  });
  return body.data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await request<void>(`/department/${id}`, { method: "DELETE" });
}

export async function listUsers(): Promise<UserAdmin[]> {
  const body = await request<Paginated<UserAdmin>>("/user?limit=100", { method: "GET" });
  return body.data;
}

export async function updateUser(
  id: string,
  input: { role?: Role; department_id?: string | null; is_active?: boolean },
): Promise<UserAdmin> {
  const body = await request<{ data: UserAdmin }>(`/user/${id}`, {
    method: "PATCH",
    body: input,
  });
  return body.data;
}
