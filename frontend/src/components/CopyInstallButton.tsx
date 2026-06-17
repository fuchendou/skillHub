"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toaster";

export function CopyInstallButton({
  command,
  label = "Copy install",
  compact = false,
}: {
  command: string;
  label?: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast("success", "Install command copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("error", "Could not access the clipboard.");
    }
  }

  return (
    <button onClick={copy} className={`btn primary ${compact ? "small" : ""}`} type="button">
      {copied ? <Check className="icon" /> : <Copy className="icon" />}
      {copied ? "Copied" : label}
    </button>
  );
}
