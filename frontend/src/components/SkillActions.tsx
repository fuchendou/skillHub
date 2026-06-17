"use client";

import { Archive, Check, RotateCcw, Star, X } from "lucide-react";
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
  const canPublish = isAdmin && (skill.status === "pending" || skill.status === "unpublished");
  const canReject = isAdmin && skill.status === "pending";
  const canFeature = isAdmin && skill.status === "published" && !skill.is_featured;
  const canUnfeature = isAdmin && skill.status === "published" && skill.is_featured;
  const canUnpublish = isAdmin && skill.status === "published";
  const canResubmit = isOwner && (skill.status === "rejected" || skill.status === "draft");

  if (!canPublish && !canReject && !canFeature && !canUnfeature && !canUnpublish && !canResubmit) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="actions" style={{ justifyContent: "flex-start" }}>
        {canPublish && (
          <Button variant="primary" disabled={busy} onClick={() => run(() => publishSkill(skill.id), "Skill published.")}>
            <Check className="icon" />
            {skill.status === "unpublished" ? "Restore" : "Publish"}
          </Button>
        )}
        {canReject && (
          <Button variant="danger" disabled={busy} onClick={() => setShowReject((v) => !v)}>
            <X className="icon" />
            Reject
          </Button>
        )}
        {canFeature && (
          <Button disabled={busy} onClick={() => run(() => featureSkill(skill.id), "Marked as featured.")}>
            <Star className="icon" />
            Feature
          </Button>
        )}
        {canUnfeature && (
          <Button disabled={busy} onClick={() => run(() => unfeatureSkill(skill.id), "Removed featured mark.")}>
            <Star className="icon" />
            Unfeature
          </Button>
        )}
        {canUnpublish && (
          <Button variant="danger" disabled={busy} onClick={() => run(() => unpublishSkill(skill.id), "Skill unpublished.")}>
            <Archive className="icon" />
            Unpublish
          </Button>
        )}
        {canResubmit && (
          <Button variant="primary" disabled={busy} onClick={() => run(() => resubmitSkill(skill.id), "Resubmitted for review.")}>
            <RotateCcw className="icon" />
            Resubmit
          </Button>
        )}
      </div>

      {showReject && canReject && (
        <div className="surface-flat grid gap-3 p-3">
          <label className="field">
            <span className="form-label">Rejection reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Tell the submitter what to fix before resubmission."
            />
          </label>
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Button
              variant="danger"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                await run(() => rejectSkill(skill.id, reason.trim()), "Skill rejected.");
                setShowReject(false);
                setReason("");
              }}
            >
              <X className="icon" />
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
