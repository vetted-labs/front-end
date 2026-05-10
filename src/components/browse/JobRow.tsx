"use client";

import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { STATUS_COLORS } from "@/config/colors";
import { GuildBadge } from "@/components/ui/guild";
import { cn, formatSalaryRange, getTimeAgo } from "@/lib/utils";
import type { Job } from "@/types";

interface JobRowProps {
  job: Job;
  isActive: boolean;
  hasApplied: boolean;
  showAppliedBadge: boolean;
  /**
   * Called when the row is clicked on lg+ screens (preview-pane mode).
   * Mobile uses `mobileHref` instead.
   */
  onSelect: (jobId: string) => void;
  mobileHref: string;
}

export function JobRow({
  job,
  isActive,
  hasApplied,
  showAppliedBadge,
  onSelect,
  mobileHref,
}: JobRowProps) {
  const logoUrl = job.companyLogo
    ? getAssetUrl(job.companyLogo)
    : getCompanyAvatar(job.companyName);

  const salaryLabel = formatSalaryRange(job.salary);
  const metaBits = [salaryLabel, job.type, getTimeAgo(job.createdAt)].filter(
    (bit): bit is string => Boolean(bit) && bit !== "Salary not specified",
  );

  const locationBits = [job.companyName, job.location || job.locationType]
    .filter((bit): bit is string => Boolean(bit))
    .join(" · ");

  const inner = (
    <>
      {/* Featured top accent bar */}
      {job.featured && (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-warning via-primary to-warning/60"
        />
      )}

      <div className="flex items-start gap-3">
        {/* Company logo */}
        <div className="relative w-9 h-9 rounded-lg border border-border bg-white p-1 flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- backend-served upload */}
          <img
            src={logoUrl}
            alt={job.companyName ? `${job.companyName} logo` : "Company logo"}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title + featured marker */}
          <div className="flex items-start gap-1.5">
            <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 tracking-tight">
              {job.title}
            </h3>
            {job.featured && (
              <Star
                className="w-3 h-3 text-warning fill-warning flex-shrink-0 mt-0.5"
                aria-label="Featured role"
              />
            )}
          </div>

          {/* Company · location */}
          {locationBits && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {locationBits}
            </p>
          )}

          {/* Meta line */}
          {metaBits.length > 0 && (
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 flex items-center gap-1.5 flex-wrap">
              {metaBits.map((bit, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="opacity-50">·</span>}
                  <span className="whitespace-nowrap">{bit}</span>
                </span>
              ))}
            </p>
          )}

          {/* Pill row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {job.guild && <GuildBadge guild={job.guild} size="xs" />}
            {job.experienceLevel && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted/40 border border-border text-muted-foreground capitalize">
                {job.experienceLevel}
              </span>
            )}
            {showAppliedBadge && hasApplied && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium",
                  STATUS_COLORS.positive.badge,
                )}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                Applied
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const baseClasses = cn(
    "relative block w-full text-left border-b border-border transition-colors py-3.5 pr-5",
    isActive
      ? "bg-muted/40 border-l-2 border-l-primary pl-[18px]"
      : "pl-5 hover:bg-muted/20 border-l-2 border-l-transparent",
  );

  // Mobile: link to detail page
  // Desktop (lg+): button to switch preview
  return (
    <>
      <Link
        href={mobileHref}
        className={cn(baseClasses, "lg:hidden")}
        aria-current={isActive ? "true" : undefined}
      >
        {inner}
      </Link>
      <button
        type="button"
        onClick={() => onSelect(job.id)}
        className={cn(baseClasses, "hidden lg:block focus:outline-none focus:bg-muted/40")}
        aria-current={isActive ? "true" : undefined}
        aria-pressed={isActive}
      >
        {inner}
      </button>
    </>
  );
}
