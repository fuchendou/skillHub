"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { createDepartment, deleteDepartment } from "@/lib/api/admin";
import { listDepartments } from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth/AuthProvider";

const fieldCls =
  "rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none";

export default function DepartmentsPage() {
  const { ready, role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: role === "admin" });

  if (!ready) return <Spinner label="Loading session..." />;
  if (role !== "admin") return <p className="text-sm text-zinc-400">Admin access is required.</p>;

  async function addDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await createDepartment(name.trim());
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast("success", "Department created.");
    } catch {
      toast("error", "Could not create department.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDepartment(id: string) {
    setBusy(true);
    try {
      await deleteDepartment(id);
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast("success", "Department deleted.");
    } catch {
      toast("error", "Department is still in use or could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Departments</h2>
        <p className="mt-1 text-sm text-zinc-400">Manage department names used for member catalog visibility.</p>
      </header>

      <form onSubmit={addDepartment} className="flex gap-2">
        <input
          className={`${fieldCls} min-w-0 flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Department name"
        />
        <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
          Add
        </Button>
      </form>

      {departments.isPending ? (
        <Spinner label="Loading departments..." />
      ) : departments.isError ? (
        <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />
      ) : departments.data.length === 0 ? (
        <EmptyState title="No departments yet" />
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {departments.data.map((department) => (
            <li key={department.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-100">{department.name}</p>
                <p className="text-xs text-zinc-500">{department.slug}</p>
              </div>
              <Button variant="danger" disabled={busy} onClick={() => removeDepartment(department.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
