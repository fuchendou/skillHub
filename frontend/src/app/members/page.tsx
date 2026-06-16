"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/Toaster";
import { ErrorState, Spinner } from "@/components/ui";
import { listUsers, updateUser } from "@/lib/api/admin";
import { listDepartments } from "@/lib/api/catalog";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const controlCls =
  "rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-1 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none";

export default function MembersPage() {
  const { ready, role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers, enabled: role === "admin" });
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: role === "admin" });

  if (!ready) return <Spinner label="Loading session..." />;
  if (role !== "admin") return <p className="text-sm text-zinc-400">Admin access is required.</p>;
  if (users.isPending || departments.isPending) return <Spinner label="Loading members..." />;
  if (users.isError || departments.isError) {
    return <ErrorState message="Could not load members." onRetry={() => queryClient.invalidateQueries()} />;
  }

  async function patch(id: string, input: { role?: Role; department_id?: string | null; is_active?: boolean }) {
    try {
      await updateUser(id, input);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("success", "Member updated.");
    } catch {
      toast("error", "Could not update member.");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Members</h2>
        <p className="mt-1 text-sm text-zinc-400">Manage roles, departments, and active state.</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.data.map((member) => (
              <tr key={member.id} className="text-zinc-300">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{member.display_name}</p>
                  <p className="text-xs text-zinc-500">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={controlCls}
                    value={member.role}
                    onChange={(e) => patch(member.id, { role: e.target.value as Role })}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={controlCls}
                    value={member.department?.id ?? ""}
                    onChange={(e) => patch(member.id, { department_id: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {departments.data.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={member.is_active}
                    onChange={(e) => patch(member.id, { is_active: e.target.checked })}
                    className="h-4 w-4 accent-sky-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
