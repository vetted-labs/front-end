"use client";

import { useState } from "react";
import { ReviewGuildApplicationModal } from "@/components/guild/ReviewGuildApplicationModal";
import {
  STORY_LAB_REVIEW_APPLICATION,
  STORY_LAB_GENERAL_TEMPLATE,
  STORY_LAB_LEVEL_TEMPLATE,
} from "@/components/expert/story-lab/storyLabFixtures";
import type { ReviewModalApplication } from "@/types";

/**
 * Dev-only preview surface for ReviewGuildApplicationModal.
 *
 *   /preview/review-modal
 *
 * Renders the multi-step review modal against the story-lab Maya Chen
 * fixture in practice mode. No wallet, no backend, no auth required —
 * useful for visual regression and responsive testing at narrow widths.
 */
export default function ReviewModalPreviewPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [reviewType, setReviewType] = useState<"candidate" | "expert">(
    "candidate",
  );

  const application: ReviewModalApplication = {
    id: STORY_LAB_REVIEW_APPLICATION.id,
    fullName: STORY_LAB_REVIEW_APPLICATION.fullName,
    email: STORY_LAB_REVIEW_APPLICATION.email,
    expertiseLevel: STORY_LAB_REVIEW_APPLICATION.expertiseLevel,
    resumeUrl: STORY_LAB_REVIEW_APPLICATION.resumeUrl,
    linkedinUrl: STORY_LAB_REVIEW_APPLICATION.linkedinUrl,
    portfolioUrl: STORY_LAB_REVIEW_APPLICATION.portfolioUrl,
    currentTitle: STORY_LAB_REVIEW_APPLICATION.currentTitle,
    currentCompany: STORY_LAB_REVIEW_APPLICATION.currentCompany,
    yearsOfExperience: STORY_LAB_REVIEW_APPLICATION.yearsOfExperience,
    bio: STORY_LAB_REVIEW_APPLICATION.bio,
    motivation: STORY_LAB_REVIEW_APPLICATION.motivation,
    expertiseAreas: STORY_LAB_REVIEW_APPLICATION.expertiseAreas,
    applicationResponses: STORY_LAB_REVIEW_APPLICATION.applicationResponses,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Dev preview
          </p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Review modal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Renders <code>ReviewGuildApplicationModal</code> in practice mode
            against the story-lab fixture. No auth or backend required.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Review type
            </label>
            <div className="flex gap-2">
              {(["candidate", "expert"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReviewType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    reviewType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Open modal
          </button>
        </div>
      </div>

      <ReviewGuildApplicationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        application={application}
        guildId={STORY_LAB_REVIEW_APPLICATION.guildId ?? "preview-guild"}
        onSubmitReview={async () => {
          await new Promise((r) => setTimeout(r, 300));
          return undefined;
        }}
        isReviewing={false}
        reviewType={reviewType}
        mode="practice"
        templateOverrides={{
          generalTemplate: STORY_LAB_GENERAL_TEMPLATE,
          levelTemplate: STORY_LAB_LEVEL_TEMPLATE,
        }}
        onPracticeComplete={() => setIsOpen(false)}
      />
    </div>
  );
}
