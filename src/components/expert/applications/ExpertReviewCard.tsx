"use client";

import { ChevronRight, Clock, ExternalLink, Eye, FileText, Users, ShieldCheck, Briefcase } from "lucide-react";
import { CountdownBadge } from "@/components/ui/countdown-badge";
import { getAssetUrl } from "@/lib/api";
import { CONTRACT_ADDRESSES } from "@/contracts/abis";
import { VETTING_REVIEW_STATE_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
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
        bar: "bg-positive",
        avatar: "bg-positive/70",
      };
    case "committed":
      return {
        bar: "bg-info-blue",
        avatar: "bg-info-blue/70",
      };
    default: // needs_review
      return {
        bar: "bg-primary",
        avatar: "bg-primary/70",
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
    commit: STATUS_COLORS.warning.text,
    reveal: STATUS_COLORS.info.text,
    finalized: STATUS_COLORS.positive.text,
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
    <div className="group rounded-xl bg-card border border-border transition-all hover:border-primary/30 dark:hover:border-border">

      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div
          className={`shrink-0 w-[46px] h-[46px] rounded-xl ${accentColors.avatar} flex items-center justify-center`}
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
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs uppercase tracking-wider text-muted-foreground font-medium border border-border">
              {application.expertiseLevel}
            </span>
            {showGuildBadge && application.guildName && (
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full ${STATUS_COLORS.info.bgSubtle} border ${STATUS_COLORS.info.border} text-xs ${STATUS_COLORS.info.text} font-medium`}>
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
            <span className="inline-flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {new Date(application.appliedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {application.reviewCount} reviewed
            </span>
            {(application.currentTitle || application.currentCompany) && (
              <span className="inline-flex items-center gap-2">
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
                className="inline-flex items-center gap-2 text-primary/70 hover:text-primary transition-colors"
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
                className="inline-flex items-center gap-2 text-primary/70 hover:text-primary transition-colors"
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
                className={`inline-flex items-center gap-2 ${STATUS_COLORS.positive.text} hover:opacity-80 transition-colors`}
                onClick={(e) => e.stopPropagation()}
              >
                <ShieldCheck className="w-3 h-3" />
                On-chain <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className={`inline-flex items-center gap-2 font-medium ${
              vettingState === "finalized" || vettingState === "revealed"
                ? STATUS_COLORS.positive.text
                : vettingState === "committed"
                ? STATUS_COLORS.info.text
                : "text-primary"
            }`}>
              <span className={`w-[5px] h-[5px] rounded-full ${
                vettingState === "finalized" || vettingState === "revealed"
                  ? STATUS_COLORS.positive.dot
                  : vettingState === "committed"
                  ? STATUS_COLORS.info.dot
                  : "bg-primary"
              }`} />
              {stateConfig.label}
            </span>
          </div>

          {/* Commit-reveal phase + timer */}
          {isCommitReveal && (
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              <span className={`inline-flex items-center gap-2 font-medium ${phaseColor[phase!] ?? "text-muted-foreground"}`}>
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
        <div className="shrink-0 flex items-center">
          {isReviewed ? (
            onViewReview ? (
              <button
                onClick={() => onViewReview(application)}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">{stateConfig.label}</span>
            )
          ) : (
            <button
              onClick={() => onReview(application)}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Review
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
