"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { useToast } from "@/components/Toaster";
import { ErrorState, Spinner } from "@/components/ui";
import { listUsers, updateUser } from "@/lib/api/admin";
import { listDepartments } from "@/lib/api/catalog";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MembersPage() {
  const { ready, role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers, enabled: role === "admin" });
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: role === "admin" });

  if (!ready) return <Spinner label="Loading session..." />;
  if (role !== "admin") return <p className="surface-flat p-6 text-sm text-slate-500">Admin access is required.</p>;
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
    <div>
      <header className="page-head">
        <div>
          <h1>Members</h1>
          <p>Manage roles, departments, and active state for Skill Hub accounts.</p>
        </div>
        <div className="scope-pill">
          <Users className="icon" />
          {users.data.length} members
        </div>
      </header>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.data.map((member) => (
              <tr key={member.id}>
                <td>
                  <p className="font-bold text-slate-900">{member.display_name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </td>
                <td>
                  <select
                    className="field-control"
                    value={member.role}
                    onChange={(e) => patch(member.id, { role: e.target.value as Role })}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <select
                    className="field-control"
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
                <td>
                  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={member.is_active}
                      onChange={(e) => patch(member.id, { is_active: e.target.checked })}
                      className="h-4 w-4 accent-teal-700"
                    />
                    {member.is_active ? "Active" : "Disabled"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
