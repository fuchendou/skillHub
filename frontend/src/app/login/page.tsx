"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await login(email, password);
      toast("success", "Signed in.");
      router.push("/");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Login failed.");
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
        <h1>Sign in to Skill Hub</h1>
        <p>Access the internal catalog, submissions, and review workspace.</p>

        <form onSubmit={submit} className="mt-7 grid gap-5">
          <label className="field">
            <span className="form-label">Email</span>
            <input
              className="field-control"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span className="form-label">Password</span>
            <input
              className="field-control"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <Button type="submit" variant="primary" disabled={busy} className="mt-5 w-full">
            <LogIn className="icon" />
            {busy ? "Signing in" : "Sign in"}
          </Button>
        </form>

        <Link href="/register" className="mt-5 block text-center text-sm font-bold text-teal-700 hover:text-teal-900">
          Create an account
        </Link>
      </section>
    </main>
  );
}
