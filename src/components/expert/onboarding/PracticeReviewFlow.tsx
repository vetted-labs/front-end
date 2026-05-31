"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ReviewGuildApplicationModal } from "@/components/guild/ReviewGuildApplicationModal";
import { Button } from "@/components/ui/button";
import {
  PRACTICE_GENERAL_TEMPLATE,
  PRACTICE_LEVEL_TEMPLATE,
  PRACTICE_REVIEW_APPLICATION,
  PRACTICE_REVIEW_GUILD_ID,
} from "@/components/expert/onboarding/practiceReviewData";

interface PracticeReviewFlowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  forceCompletion?: boolean;
  practiceActions?: ReactNode | null;
  completionActionLabel?: string;
}

export function PracticeReviewFlow({
  isOpen,
  onOpenChange,
  onComplete,
  forceCompletion = false,
  practiceActions,
  completionActionLabel,
}: PracticeReviewFlowProps) {
  const defaultPracticeActions = (
    <>
      <Link
        href="/expert/voting"
        onClick={() => onOpenChange(false)}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to Applications
      </Link>
      <Link
        href="/expert/dashboard?openStaking=withdraw"
        onClick={() => onOpenChange(false)}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Check staking
      </Link>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Back to dashboard
      </Button>
    </>
  );

  return (
    <ReviewGuildApplicationModal
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      application={PRACTICE_REVIEW_APPLICATION}
      guildId={PRACTICE_REVIEW_GUILD_ID}
      onSubmitReview={async () => undefined}
      isReviewing={false}
      mode="practice"
      forceCompletion={forceCompletion}
      templateOverrides={{
        generalTemplate: PRACTICE_GENERAL_TEMPLATE,
        levelTemplate: PRACTICE_LEVEL_TEMPLATE,
      }}
      onPracticeComplete={onComplete}
      practiceActions={
        practiceActions === undefined ? defaultPracticeActions : practiceActions
      }
      completionActionLabel={completionActionLabel}
    />
  );
}
