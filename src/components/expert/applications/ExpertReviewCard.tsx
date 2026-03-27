"use client";

import { CheckCircle, Clock, ExternalLink, Eye, FileText, Users, ShieldCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { getAssetUrl } from "@/lib/api";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { VETTING_REVIEW_STATE_CONFIG } from "@/config/constants";
import type { ExpertMembershipApplication } from "@/types";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

interface ExpertReviewCardProps {
  application: ExpertMembershipApplication;
  onReview: (application: ExpertMembershipApplication) => void;
  onViewReview?: (application: ExpertMembershipApplication) => void;
  showGuildBadge?: boolean;
}

/** Returns the accent bar + avatar gradient classes based on vetting state */
function getAccentColors(vettingState: string): {
  bar: string;
  avatar: string;
} {
  switch (vettingState) {
    case "finalized":
    case "revealed":
      return {
        bar: "from-green-500 to-green-500/30",
        avatar: "from-green-500/80 to-green-600/60",
      };
    case "committed":
      return {
        bar: "from-blue-500 to-blue-500/30",
        avatar: "from-blue-500/80 to-blue-600/60",
      };
    default: // needs_review
      return {
        bar: "from-primary to-primary/30",
        avatar: "from-primary/80 to-primary/60",
      };
  }
}

/** Derives 1-2 uppercase initials from a full name */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function ExpertReviewCard({ application, onReview, onViewReview, showGuildBadge }: ExpertReviewCardProps) {
  const isReviewed = application.expertHasReviewed;
  const phase = application.votingPhase;
  const isCommitReveal = phase === "commit" || phase === "finalized";

  const activeDeadline = phase === "commit"
    ? application.commitDeadline
    : undefined;

  const phaseLabel: Record<string, string> = {
    commit: "Voting open",
    finalized: "Finalized",
  };

  const phaseColor: Record<string, string> = {
    commit: "text-amber-400",
    reveal: "text-blue-400",
    finalized: "text-green-400",
  };

  // Derive vetting review state for the status badge
  const vettingState = phase === "finalized"
    ? "finalized"
    : isReviewed && phase === "commit"
    ? "committed"
    : isReviewed
    ? "revealed"
    : "needs_review";

  const stateConfig = VETTING_REVIEW_STATE_CONFIG[vettingState];
  const accentColors = getAccentColors(vettingState);
  const initials = getInitials(application.fullName);

  return (
    <div className="group rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md border border-border/60 dark:border-white/[0.06] transition-all hover:border-primary/30 dark:hover:border-white/[0.12]">
      {/* Accent bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentColors.bar}`} />

      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div
          className={`shrink-0 w-[46px] h-[46px] rounded-xl bg-gradient-to-br ${accentColors.avatar} flex items-center justify-center`}
          aria-hidden="true"
        >
          <span className="text-sm font-bold text-white leading-none">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + level badge + guild pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-foreground truncate">
              {application.fullName}
            </h4>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-muted-foreground font-medium border border-border/50">
              {application.expertiseLevel}
            </span>
            {showGuildBadge && application.guildName && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/8 border border-indigo-500/15 text-[11px] text-indigo-400 font-medium">
                {application.guildName}
              </span>
            )}
          </div>

          {/* Row 2: Email */}
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {application.email}
          </p>

          {/* Row 3: Date + review count + job title + links */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(application.appliedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {application.reviewCount} reviewed
            </span>
            {(application.currentTitle || application.currentCompany) && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {application.currentTitle}
                {application.currentTitle && application.currentCompany && " at "}
                {application.currentCompany}
                {application.yearsOfExperience > 0 && ` · ${application.yearsOfExperience}y`}
              </span>
            )}
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
                    : `${ETHERSCAN_BASE}/address/${CONTRACT_ADDRESSES.VETTING}`
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
              {activeDeadline && phase !== "finalized" && (
                <CountdownBadge deadline={activeDeadline} label="Commit" />
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {/* Vetting state badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg ${stateConfig.className}`}>
            {vettingState === "finalized" ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : vettingState === "revealed" ? (
              <Eye className="w-3.5 h-3.5" />
            ) : vettingState === "committed" ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {stateConfig.label}
          </span>

          {/* Action buttons */}
          {isReviewed ? (
            onViewReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewReview(application)}
                className="text-xs border border-border/60 hover:border-border"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
            )
          ) : (
            <Button
              onClick={() => onReview(application)}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
            >
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
