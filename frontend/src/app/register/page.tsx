"use client";

import { ShieldCheck, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button, ErrorState, Spinner } from "@/components/ui";
import { registerMember } from "@/lib/api/auth";
import { listDepartments } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const departments = useQuery({ queryKey: ["departments", "public"], queryFn: listDepartments });
  const [form, setForm] = useState({ email: "", display_name: "", password: "", department_id: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await registerMember(form);
      await login(form.email, form.password);
      toast("success", "Account created.");
      router.push("/");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand text-slate-900">
          <span className="brand-mark">
            <ShieldCheck className="icon" />
          </span>
          <span>Skill Hub</span>
        </div>
        <h1>Create an account</h1>
        <p>New accounts are members scoped to one department.</p>

        {departments.isPending ? (
          <div className="mt-6">
            <Spinner label="Loading departments..." />
          </div>
        ) : departments.isError ? (
          <div className="mt-6">
            <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 grid gap-5">
            <label className="field">
              <span className="form-label">Email</span>
              <input
                className="field-control"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span className="form-label">Display name</span>
              <input
                className="field-control"
                placeholder="Mina Torres"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span className="form-label">Password</span>
              <input
                className="field-control"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span className="form-label">Department</span>
              <select
                className="field-control"
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Choose a department
                </option>
                {departments.data.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" disabled={busy} className="mt-5 w-full">
              <UserPlus className="icon" />
              {busy ? "Creating account" : "Create account"}
            </Button>
          </form>
        )}

        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-teal-700 hover:text-teal-900">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
