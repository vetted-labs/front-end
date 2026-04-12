"use client";

import { useState } from "react";
import { X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/ui/HelpLink";
import { DOC_LINKS } from "@/config/docLinks";

export function FirstTimeReviewerGuide() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("vetted:reviewer-guide-seen") === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("vetted:reviewer-guide-seen", "true");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-6 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss guide"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <BookOpen className="h-6 w-6 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="font-bold mb-2">Welcome to your first review!</h3>
          <p className="text-sm text-muted-foreground mb-3">Here&apos;s how vetting works:</p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><strong>Review the candidate profile</strong> — read their application, experience, and answers</li>
            <li><strong>Score using the rubric</strong> — rate each criterion with a justification</li>
            <li><strong>Commit your vote (blind)</strong> — your score is encrypted so other experts can&apos;t see it</li>
            <li><strong>Reveal your vote</strong> — after all experts commit, reveal your score for consensus</li>
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Got it, let&apos;s review!
            </Button>
            <HelpLink href={DOC_LINKS.commitReveal}>
              Read the full guide
            </HelpLink>
          </div>
        </div>
      </div>
    </div>
  );
}
