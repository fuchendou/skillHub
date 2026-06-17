"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { createDepartment, deleteDepartment } from "@/lib/api/admin";
import { listDepartments } from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DepartmentsPage() {
  const { ready, role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: role === "admin" });

  if (!ready) return <Spinner label="Loading session..." />;
  if (role !== "admin") return <p className="surface-flat p-6 text-sm text-slate-500">Admin access is required.</p>;

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
    <div>
      <header className="page-head">
        <div>
          <h1>Department visibility</h1>
          <p>See and manage the departments used to scope published skill access.</p>
        </div>
        <div className="scope-pill">
          <Building2 className="icon" />
          {departments.data?.length ?? 0} departments
        </div>
      </header>

      <form onSubmit={addDepartment} className="surface toolbar mb-4">
        <div className="search-row">
          <input
            className="field-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
          />
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
            <Plus className="icon" />
            Add
          </Button>
        </div>
      </form>

      {departments.isPending ? (
        <Spinner label="Loading departments..." />
      ) : departments.isError ? (
        <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />
      ) : departments.data.length === 0 ? (
        <EmptyState title="No departments yet" />
      ) : (
        <section className="surface list">
          {departments.data.map((department) => (
            <article key={department.id} className="list-row admin-row">
              <div className="row-main">
                <div className="badge-row">
                  <span className="badge info">
                    <Building2 className="icon" />
                    Department
                  </span>
                </div>
                <h3>{department.name}</h3>
                <p>{department.slug}</p>
              </div>
              <div className="stack tight">
                <span className="mini">Catalog scope</span>
                <strong>Available for assignment</strong>
              </div>
              <div className="actions">
                <Button variant="danger" disabled={busy} onClick={() => removeDepartment(department.id)}>
                  <Trash2 className="icon" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
