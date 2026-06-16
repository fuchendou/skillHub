"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/Toaster";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import {
  featureSkill,
  publishSkill,
  rejectSkill,
  resubmitSkill,
  unfeatureSkill,
  unpublishSkill,
} from "@/lib/api/skills";
import type { Skill } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Admin lifecycle controls + owner resubmit. Buttons disable while a mutation is in flight
 * (first line of double-click defense); the API's idempotency makes a retry safe regardless.
 * After success the React Query cache is invalidated so every view reflects the new state.
 */
export function SkillActions({ skill }: { skill: Skill }) {
  const { role, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function run(fn: () => Promise<Skill>, ok: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast("success", ok);
      await queryClient.invalidateQueries();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = role === "admin";
  const isOwner = user?.id === skill.owner.id;
  const showAny =
    (isAdmin && skill.status !== "draft") ||
    (isOwner && (skill.status === "rejected" || skill.status === "draft"));

  if (!showAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && skill.status !== "published" && (
        <Button variant="primary" disabled={busy} onClick={() => run(() => publishSkill(skill.id), "Skill published.")}>
          Publish
        </Button>
      )}
      {isAdmin && (skill.status === "pending" || skill.status === "draft") && (
        <Button variant="danger" disabled={busy} onClick={() => setShowReject((v) => !v)}>
          Reject…
        </Button>
      )}
      {isAdmin && skill.status === "published" && !skill.is_featured && (
        <Button disabled={busy} onClick={() => run(() => featureSkill(skill.id), "Marked as featured.")}>
          Feature
        </Button>
      )}
      {isAdmin && skill.status === "published" && skill.is_featured && (
        <Button disabled={busy} onClick={() => run(() => unfeatureSkill(skill.id), "Removed featured mark.")}>
          Unfeature
        </Button>
      )}
      {isAdmin && skill.status === "published" && (
        <Button disabled={busy} onClick={() => run(() => unpublishSkill(skill.id), "Skill unpublished.")}>
          Unpublish
        </Button>
      )}
      {isOwner && (skill.status === "rejected" || skill.status === "draft") && (
        <Button variant="primary" disabled={busy} onClick={() => run(() => resubmitSkill(skill.id), "Resubmitted for review.")}>
          Resubmit
        </Button>
      )}

      {showReject && isAdmin && (
        <div className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Reason for rejection (required)…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                await run(() => rejectSkill(skill.id, reason.trim()), "Skill rejected.");
                setShowReject(false);
                setReason("");
              }}
            >
              Confirm reject
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowReject(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
