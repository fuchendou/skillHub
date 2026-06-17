"use client";

import clsx from "clsx";
import { AlertCircle, Loader2, SearchX } from "lucide-react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500" role="status">
      <Loader2 className="icon animate-spin text-teal-700" />
      {label ?? "Loading..."}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="surface-flat flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <SearchX className="h-8 w-8 text-slate-400" />
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn secondary mt-1">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-16 text-center">
      <AlertCircle className="h-8 w-8 text-red-700" />
      <p className="text-sm font-bold text-red-800">Something went wrong</p>
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn danger mt-1">
          Retry
        </button>
      )}
    </div>
  );
}

export function Button({
  variant = "default",
  size = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost" | "secondary" | "rail";
  size?: "default" | "small";
}) {
  return (
    <button
      {...props}
      className={clsx(
        "btn",
        size === "small" && "small",
        variant === "primary" && "primary",
        variant === "danger" && "danger",
        variant === "ghost" && "ghost",
        variant === "secondary" && "secondary",
        variant === "rail" && "rail",
        className,
      )}
    />
  );
}
