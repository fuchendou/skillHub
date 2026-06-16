"use client";

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

const fieldCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none";

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

  if (departments.isPending) {
    return <Spinner label="Loading departments..." />;
  }
  if (departments.isError) {
    return <ErrorState message="Could not load departments." onRetry={() => departments.refetch()} />;
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Register</h2>
        <p className="mt-1 text-sm text-zinc-400">Create a member account.</p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        <input
          className={fieldCls}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          autoComplete="username"
          required
        />
        <input
          className={fieldCls}
          placeholder="Display name"
          value={form.display_name}
          onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          required
        />
        <input
          className={fieldCls}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          autoComplete="new-password"
          required
        />
        <select
          className={fieldCls}
          value={form.department_id}
          onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
          required
        >
          <option value="" disabled>
            Department
          </option>
          {departments.data.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <Link href="/login" className="block text-center text-sm text-zinc-500 hover:text-zinc-300">
        Sign in instead
      </Link>
    </div>
  );
}
