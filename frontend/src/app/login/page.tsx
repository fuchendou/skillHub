"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { DEMO_CREDENTIALS, useAuth } from "@/lib/auth/AuthProvider";

const fieldCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none";

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

  function fill(kind: "admin" | "creator") {
    setEmail(DEMO_CREDENTIALS[kind].email);
    setPassword(DEMO_CREDENTIALS[kind].password);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-100">Sign in</h2>
        <p className="mt-1 text-sm text-zinc-400">Sign in as a creator or admin.</p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        <input
          className={fieldCls}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          className={fieldCls}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
        <p className="mb-2 font-medium text-zinc-300">Demo accounts (from the seed):</p>
        <div className="flex gap-2">
          <button onClick={() => fill("admin")} className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800">
            Fill admin
          </button>
          <button onClick={() => fill("creator")} className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800">
            Fill creator
          </button>
        </div>
      </div>

      <Link href="/" className="block text-center text-sm text-zinc-500 hover:text-zinc-300">
        ← Back to the catalog
      </Link>
    </div>
  );
}
