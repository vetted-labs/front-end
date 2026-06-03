"use client";

import { Check, Clock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Quest } from "@/types";

interface QuestCardProps {
  quest: Quest;
  /** Self-attested one-time quest (e.g. follow) → mark complete. */
  onComplete?: (quest: Quest) => void;
  /** Verifiable quest → open the submission modal. */
  onSubmit?: (quest: Quest) => void;
  /** Referral quest → jump to the referral panel. */
  onReferral?: () => void;
  /** VET-115: share a completed answer to the expert feed (text-answer quests). */
  onShare?: (quest: Quest) => void;
  /** True once this answer has been shared and is awaiting team review. */
  sharePending?: boolean;
  busy?: boolean;
  /**
   * VET-115 MILESTONE-ONLY: specific quests no longer carry an individual VETD payout.
   * When set, the per-quest reward badge is replaced by allocation copy.
   */
  hideReward?: boolean;
}

export function QuestCard({
  quest,
  onComplete,
  onSubmit,
  onReferral,
  onShare,
  sharePending = false,
  busy,
  hideReward = false,
}: QuestCardProps) {
  const status = quest.myStatus;
  const isDone = status === "completed" || status === "approved";
  const isPending = status === "submitted";
  const isRejected = status === "rejected";
  // Repeatable quests can always be done again even after a prior completion.
  const canAct = !isPending && (!isDone || quest.repeatable);
  // A free-text answer that's been approved can be shared to the expert feed.
  const isShareable =
    !!onShare &&
    status === "approved" &&
    (quest.actionType === "expertise_answer" ||
      quest.questType === "text_answer" ||
      quest.questType === "rubric");

  function renderAction() {
    if (isPending) return <StatusBadge status="pending" label="Pending review" />;
    if (!canAct && isDone) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
          <Check className="h-4 w-4" /> Completed
        </span>
      );
    }
    if (quest.questType === "referral") {
      return (
        <Button variant="outline" size="sm" onClick={onReferral}>
          Get link
        </Button>
      );
    }
    if (quest.requiresVerification) {
      return (
        <Button variant="outline" size="sm" onClick={() => onSubmit?.(quest)}>
          {isRejected ? "Resubmit" : "Submit"}
        </Button>
      );
    }
    return (
      <Button variant="default" size="sm" isLoading={busy} onClick={() => onComplete?.(quest)}>
        Mark done
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4",
        isDone && !quest.repeatable && "opacity-70",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isDone ? (
            <Check className="h-4 w-4 shrink-0 text-positive" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <p className="truncate text-sm font-semibold text-foreground">{quest.title}</p>
        </div>
        {quest.description && (
          <p className="mt-1 text-xs text-muted-foreground">{quest.description}</p>
        )}
        {isRejected && (
          <p className="mt-1 text-xs text-negative">Submission was not approved.</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {hideReward ? (
          <span className="max-w-[9rem] text-right text-[10px] font-medium leading-tight text-muted-foreground">
            Counts toward your 500 VETD allocation
          </span>
        ) : (
          <Badge variant="subtle">+{quest.rewardAmount} VETD</Badge>
        )}
        {renderAction()}
        {isShareable &&
          (sharePending ? (
            <StatusBadge status="pending" label="Pending team review" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              data-testid="quest-share-button"
              onClick={() => onShare?.(quest)}
            >
              <Share2 className="mr-1 h-3.5 w-3.5" /> Share to feed
            </Button>
          ))}
      </div>
    </div>
  );
}
