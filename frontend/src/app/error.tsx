"use client";

import { ErrorState } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-12">
      <ErrorState message={error.message || "An unexpected error occurred."} onRetry={reset} />
    </div>
  );
}
