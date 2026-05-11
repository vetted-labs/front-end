"use client";

import { ChevronLeft } from "lucide-react";
import { getPersonAvatar } from "@/lib/avatars";
import type { SocialLink } from "@/types";

interface ApplicantSnapshotApplication {
  id?: string;
  fullName: string;
  email: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  expertiseAreas?: string[];
  socialLinks?: SocialLink[];
}

export interface ApplicantSnapshotCardProps {
  application: ApplicantSnapshotApplication;
  level: string;
  /**
   * Click handler for "Open full profile". Should navigate the parent modal
   * back to step 1 where the full ReviewProfileStep renders.
   */
  onOpenFullProfile?: () => void;
}

/**
 * Compact applicant snapshot for the rubric-scoring steps (2 + 3) right
 * pane. The center column owns the scoring workspace — this card just
 * keeps "who am I scoring?" within glance distance.
 *
 * Designed to live in a ~320px column.
 */
export function ApplicantSnapshotCard({
  application,
  level,
  onOpenFullProfile,
}: ApplicantSnapshotCardProps) {
  const displayName = application.fullName;
  const displayTitle = application.currentTitle;
  const displayCompany = application.currentCompany;
  const positionLabel =
    displayTitle || displayCompany
      ? `${displayTitle ?? ""}${displayCompany ? ` · ${displayCompany}` : ""}`.trim()
      : null;

  const topExpertise = (application.expertiseAreas ?? []).slice(0, 4);
  const extraExpertise = Math.max(
    0,
    (application.expertiseAreas?.length ?? 0) - topExpertise.length,
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
        Applicant
      </p>

      {/* Identity card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-[2px] bg-primary/70" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={getPersonAvatar(displayName)}
              alt={displayName}
              className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold text-foreground leading-tight truncate"
                title={displayName}
              >
                {displayName}
              </p>
              {level && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold rounded uppercase tracking-wider">
                  {level}
                </span>
              )}
            </div>
          </div>

          {/* One-line facts */}
          <dl className="space-y-1.5 text-xs">
            {positionLabel && (
              <div className="flex items-baseline gap-2 min-w-0">
                <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                  Role
                </dt>
                <dd
                  className="text-foreground truncate flex-1 min-w-0"
                  title={positionLabel}
                >
                  {positionLabel}
                </dd>
              </div>
            )}
            {application.yearsOfExperience != null &&
              application.yearsOfExperience > 0 && (
                <div className="flex items-baseline gap-2 min-w-0">
                  <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                    Years
                  </dt>
                  <dd className="text-foreground flex-1 min-w-0">
                    {application.yearsOfExperience}+
                  </dd>
                </div>
              )}
            {topExpertise.length > 0 && (
              <div className="flex items-baseline gap-2 min-w-0">
                <dt className="text-muted-foreground/70 uppercase tracking-wider text-[10px] font-semibold w-16 shrink-0">
                  Skills
                </dt>
                <dd
                  className="text-foreground flex-1 min-w-0 truncate"
                  title={(application.expertiseAreas ?? []).join(" · ")}
                >
                  {topExpertise.join(" · ")}
                  {extraExpertise > 0 && (
                    <span className="text-muted-foreground/70">
                      {" "}
                      +{extraExpertise}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Open full profile — navigates back to step 1 */}
      {onOpenFullProfile && (
        <button
          type="button"
          onClick={onOpenFullProfile}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Open full profile
        </button>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Need more context? Open the full profile to review resume, bio, and
        motivation, then return here to keep scoring.
      </p>
    </div>
  );
}
