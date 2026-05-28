"use client";

import { CheckCircle2, X } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { guildFeedApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
import { toast } from "sonner";
import { useFeedContext } from "./FeedContext";

interface AcceptedAnswerBadgeProps {
  variant: "reply" | "post-card";
  /**
   * When provided alongside the "reply" variant, enables a "Remove" affordance
   * next to the badge that calls `guildFeedApi.removeAcceptedAnswer`. The
   * control is gated on the viewer being the post author OR holding officer+
   * privileges (`canAcceptOnBehalf`). When omitted the badge stays read-only,
   * preserving the existing PostCard usage.
   */
  postId?: string;
  /** Indicates the current viewer authored the post the badge belongs to. */
  isPostAuthor?: boolean;
  /** Callback fired after the accepted answer is successfully removed. */
  onRemoved?: () => void;
}

export function AcceptedAnswerBadge({
  variant,
  postId,
  isPostAuthor = false,
  onRemoved,
}: AcceptedAnswerBadgeProps) {
  // FeedContext is always available inside the feed tree. Calling it
  // unconditionally keeps the hook order stable across renders; the badge is
  // only ever rendered as a descendant of FeedProvider.
  const { guildId, privileges } = useFeedContext();
  const { execute: removeAccepted, isLoading: isRemoving } = useApi<{ success: boolean }>();
  const { ensureSession, isSigning } = useExpertSession();

  const canRemove =
    variant === "reply" && !!postId && (isPostAuthor || privileges.canAcceptOnBehalf);

  const handleRemove = async () => {
    if (!postId || isRemoving || isSigning) return;

    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    await removeAccepted(
      () => guildFeedApi.removeAcceptedAnswer(guildId, postId),
      {
        onSuccess: () => {
          toast.success("Accepted answer removed");
          onRemoved?.();
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  if (variant === "post-card") {
    return (
      <span className={`inline-flex items-center gap-2 px-2 py-0.5 text-xs font-bold rounded-full ${STATUS_COLORS.positive.badge}`}>
        <CheckCircle2 className="w-3 h-3" />
        Solved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-lg ${STATUS_COLORS.positive.badge}`}>
        <CheckCircle2 className="w-4 h-4" />
        Accepted Answer
      </span>
      {canRemove && (
        <button
          type="button"
          data-testid="remove-accepted-answer"
          onClick={handleRemove}
          disabled={isRemoving || isSigning}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Remove accepted answer"
          title="Remove accepted answer"
        >
          <X className="w-3 h-3" />
          {isSigning ? "Signing..." : isRemoving ? "Removing..." : "Remove"}
        </button>
      )}
    </span>
  );
}
