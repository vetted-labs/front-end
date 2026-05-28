"use client";

import { useState } from "react";
import { Lightbulb, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { guildFeedApi } from "@/lib/api";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
import { STATUS_COLORS } from "@/config/colors";
import type { ReactionSummary, ReactionType } from "@/types";

/**
 * Small reusable bar of toggle-buttons for "insightful" and "helpful" reactions.
 *
 * Bookmark is intentionally NOT rendered here — the `BookmarkButton` component
 * owns that surface so the existing post-bookmark UX/state (`isBookmarked`,
 * `onBookmarkToggle` plumbing in PostCard/PostDetailModal/GuildFeedTab) is
 * unaffected.
 *
 * Targets either a `post` or a `reply` via `targetType`. Posts the toggle to
 * `guildFeedApi.toggleReaction` and reconciles local state from the response
 * (the backend returns the authoritative `ReactionSummary`). Optimistic
 * increment + rollback on failure, mirroring `VoteButton`'s pattern.
 */

type SupportedReaction = Extract<ReactionType, "insightful" | "helpful">;

const REACTION_META: Record<SupportedReaction, {
  Icon: typeof Lightbulb;
  label: string;
}> = {
  insightful: { Icon: Lightbulb, label: "Insightful" },
  helpful: { Icon: ThumbsUp, label: "Helpful" },
};

interface ReactionBarProps {
  targetId: string;
  targetType: "post" | "reply";
  guildId: string;
  /**
   * Initial counts and the current user's per-reaction toggle state. Derived
   * from the backend's `ReactionSummary` on the parent post/reply. The bar
   * keeps its own local state from then on so it can render optimistic
   * increments without forcing the parent to refetch on every click.
   */
  summary: ReactionSummary;
  /**
   * Optional callback fired after a successful toggle. Use to trigger a parent
   * refetch (or noop if the parent is satisfied with the local count state).
   */
  onChange?: () => void;
}

function summaryHas(summary: ReactionSummary, reaction: ReactionType): boolean {
  return summary.userReactions.includes(reaction);
}

export function ReactionBar({
  targetId,
  targetType,
  guildId,
  summary,
  onChange,
}: ReactionBarProps) {
  const { ensureSession } = useExpertSession();

  const [counts, setCounts] = useState<Record<SupportedReaction, number>>({
    insightful: summary.insightful,
    helpful: summary.helpful,
  });
  const [active, setActive] = useState<Record<SupportedReaction, boolean>>({
    insightful: summaryHas(summary, "insightful"),
    helpful: summaryHas(summary, "helpful"),
  });
  const [pending, setPending] = useState<Record<SupportedReaction, boolean>>({
    insightful: false,
    helpful: false,
  });

  const handleToggle = async (
    e: React.MouseEvent,
    reaction: SupportedReaction,
  ) => {
    e.stopPropagation();
    if (pending[reaction]) return;

    // Gate the mutation on a fresh expert-session JWT BEFORE touching state so
    // an aborted signature leaves the optimistic count clean (same pattern as
    // VoteButton / BookmarkButton).
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        toast.error("Sign to participate");
      } else {
        toast.error(session.error ?? "Could not authenticate. Please try again.");
      }
      return;
    }

    const wasActive = active[reaction];
    const optimisticActive = !wasActive;
    const optimisticCount = counts[reaction] + (optimisticActive ? 1 : -1);

    setActive((prev) => ({ ...prev, [reaction]: optimisticActive }));
    setCounts((prev) => ({
      ...prev,
      [reaction]: Math.max(0, optimisticCount),
    }));
    setPending((prev) => ({ ...prev, [reaction]: true }));

    try {
      const result = await guildFeedApi.toggleReaction(guildId, {
        targetId,
        targetType,
        reaction,
      });
      // Reconcile from the authoritative server summary.
      setCounts({
        insightful: result.reactions.insightful,
        helpful: result.reactions.helpful,
      });
      setActive({
        insightful: result.reactions.userReactions.includes("insightful"),
        helpful: result.reactions.userReactions.includes("helpful"),
      });
      onChange?.();
    } catch {
      // Roll back the optimistic flip.
      setActive((prev) => ({ ...prev, [reaction]: wasActive }));
      setCounts((prev) => ({
        ...prev,
        [reaction]: counts[reaction],
      }));
      toast.error(`Failed to react`);
    } finally {
      setPending((prev) => ({ ...prev, [reaction]: false }));
    }
  };

  return (
    <div className="flex items-center gap-1">
      {(Object.keys(REACTION_META) as SupportedReaction[]).map((reaction) => {
        const { Icon, label } = REACTION_META[reaction];
        const isActive = active[reaction];
        return (
          <button
            key={reaction}
            type="button"
            onClick={(e) => handleToggle(e, reaction)}
            disabled={pending[reaction]}
            data-testid={`reaction-${reaction}`}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-60 ${
              isActive
                ? `${STATUS_COLORS.pending.text} ${STATUS_COLORS.pending.bgSubtle}`
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${isActive ? "fill-primary" : ""}`}
            />
            <span className="leading-none">{counts[reaction]}</span>
          </button>
        );
      })}
    </div>
  );
}
