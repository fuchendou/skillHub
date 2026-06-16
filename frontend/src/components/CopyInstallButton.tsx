"use client";

import { useState } from "react";

import { useToast } from "@/components/Toaster";

/** Copy-to-clipboard with explicit success AND failure feedback (spec.md §2 / §6). */
export function CopyInstallButton({ command }: { command: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // navigator.clipboard rejects on insecure contexts or denied permission — handle .catch.
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast("success", "Install command copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("error", "Couldn't access the clipboard — select and copy manually.");
    }
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
