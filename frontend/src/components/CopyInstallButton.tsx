"use client";

import { useState } from "react";

import { useToast } from "@/components/Toaster";

export function CopyInstallButton({ command }: { command: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast("success", "Install command copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("error", "Could not access the clipboard.");
    }
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
