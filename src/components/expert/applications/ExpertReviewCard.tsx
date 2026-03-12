"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Clock, ExternalLink, Eye, FileText, Users, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAssetUrl } from "@/lib/api";
import type { ExpertMembershipApplication } from "@/types";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

interface ExpertReviewCardProps {
  application: ExpertMembershipApplication;
  onReview: (application: ExpertMembershipApplication) => void;
  onViewReview?: (application: ExpertMembershipApplication) => void;
  showGuildBadge?: boolean;
}

function useCountdown(deadline: string | undefined) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!deadline) return;

    function calc() {
      const diff = new Date(deadline!).getTime() - Date.now();
      if (diff <= 0) return setRemaining("Expired");
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }

    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}

export function ExpertReviewCard({ application, onReview, onViewReview, showGuildBadge }: ExpertReviewCardProps) {
  const isReviewed = application.expertHasReviewed;
  const phase = application.votingPhase;
  const isCommitReveal = phase === "commit" || phase === "reveal" || phase === "finalized";

  const activeDeadline = phase === "commit"
    ? application.commitDeadline
    : phase === "reveal"
    ? application.revealDeadline
    : undefined;

  const countdown = useCountdown(activeDeadline);

  const phaseLabel: Record<string, string> = {
    commit: "Commit phase",
    reveal: "Reveal phase",
    finalized: "Finalized",
  };

  const phaseColor: Record<string, string> = {
    commit: "text-amber-400",
    reveal: "text-blue-400",
    finalized: "text-green-400",
  };

  return (
    <div className="group rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 transition-all hover:border-primary/30 dark:bg-card/40 dark:border-white/[0.06] dark:hover:border-white/[0.12]">
      <div className="flex items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-base font-semibold text-foreground truncate">
              {application.fullName}
            </h4>
            <Badge variant="outline" className="shrink-0 text-xs">
              {application.expertiseLevel}
            </Badge>
            {showGuildBadge && application.guildName && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {application.guildName}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {application.currentTitle} at {application.currentCompany}
            {application.yearsOfExperience > 0 && ` · ${application.yearsOfExperience}y exp`}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(application.appliedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {application.reviewCount} reviewed
            </span>
            {application.linkedinUrl && (
              <a
                href={application.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {application.resumeUrl && (
              <a
                href={getAssetUrl(application.resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="w-3 h-3" />
                Resume <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {application.blockchainSessionCreated && (
              <a
                href={
                  application.blockchainSessionTxHash
                    ? `${ETHERSCAN_BASE}/tx/${application.blockchainSessionTxHash}`
                    : `${ETHERSCAN_BASE}/address/0xD8fc961b0080622e66dDee8C3409BE442f635104`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-500/80 hover:text-green-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ShieldCheck className="w-3 h-3" />
                On-chain <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Commit-reveal phase + timer */}
          {isCommitReveal && (
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              <span className={`inline-flex items-center gap-1 font-medium ${phaseColor[phase!] ?? "text-muted-foreground"}`}>
                <ShieldCheck className="w-3 h-3" />
                {phaseLabel[phase!] ?? phase}
              </span>
              {countdown && phase !== "finalized" && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  {countdown} remaining
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="shrink-0 flex items-center gap-2">
          {isReviewed ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" />
                Reviewed
              </span>
              {onViewReview && (
                <Button variant="outline" size="sm" onClick={() => onViewReview(application)} className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => onReview(application)} size="sm">
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
