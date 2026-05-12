"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { getAssetUrl } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { getTimeAgo, formatSalaryRange, cn } from "@/lib/utils";
import { getMonogram } from "@/lib/monogramHelper";
import type { Job } from "@/types";

interface JobBrowserProps {
  jobs: Job[];
  isLoadingJobs: boolean;
}

export function JobBrowser({ jobs, isLoadingJobs }: JobBrowserProps) {
  const router = useRouter();
  const displayedJobs = jobs.slice(0, 6);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl tracking-tight text-foreground">
          Featured Jobs
        </h2>
        <button
          onClick={() => router.push("/browse/jobs")}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
        >
          Browse All Jobs
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Jobs */}
      {isLoadingJobs ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : displayedJobs.length > 0 ? (
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up"
          style={{ animationDelay: "400ms" }}
        >
          {displayedJobs.map((job) => (
            <FeaturedJobCard
              key={job.id}
              job={job}
              onClick={() => router.push(`/browse/jobs/${job.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border/30">
          <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
            <VettedIcon name="job" className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">
            No positions yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Check back soon for new opportunities.
          </p>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * FeaturedJobCard — Catalogue-style job card. Matches the guild card
 * system: ambient grid, mono caps header, orange accent rule, display
 * title, mono ticker strip.
 * ────────────────────────────────────────────────────────────────── */

function FeaturedJobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const guildName = job.guild?.replace(/ Guild$/i, "") ?? "";
  const guildDot = guildName ? getGuildIdentity(guildName).classes.dot : null;
  const company = job.companyName || "Company";
  const logoUrl = job.companyLogo
    ? getAssetUrl(job.companyLogo)
    : getCompanyAvatar(company);

  const salary =
    job.salary.min || job.salary.max ? formatSalaryRange(job.salary) : null;

  const tags: string[] = [];
  if (job.skills && job.skills.length > 0) {
    tags.push(...job.skills.slice(0, 3));
  } else {
    if (job.type) tags.push(job.type);
    if (job.locationType)
      tags.push(
        job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1),
      );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-border bg-card",
        "transition-colors duration-200 cursor-pointer",
        "hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <div aria-hidden className="absolute inset-0 ambient-grid" />

      <div className="relative z-10 p-5 pb-0">
        {/* Header — logo + company + guild dot */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted/40 border border-border flex items-center justify-center shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external avatar URL; next/image overkill for a 32px lockup
              <img
                src={logoUrl}
                alt={`${company} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                {getMonogram(company)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground truncate">
              {company}
            </div>
          </div>

          {guildDot && (
            <span
              className={cn("w-1.5 h-1.5 rounded-full shrink-0", guildDot)}
              title={guildName}
            />
          )}
        </div>

        {/* Orange accent rule */}
        <div className="w-8 h-px bg-primary mb-3" />

        {/* Job title */}
        <h3 className="font-display text-[17px] font-bold tracking-[-0.025em] leading-[1.15] text-foreground mb-3 line-clamp-2 min-h-[2.6em]">
          {job.title}.
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-1 rounded bg-muted/40 text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ticker strip */}
      <div className="grid grid-cols-2 border-t border-border bg-muted/40 relative z-10">
        <div className="border-r border-border py-2.5 px-3.5">
          <div className="font-mono text-[13px] font-semibold tracking-[-0.01em] tabular-nums leading-none text-primary">
            {salary ?? "—"}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
            Salary
          </div>
        </div>
        <div className="py-2.5 px-3.5">
          <div className="font-mono text-[13px] font-semibold tracking-[-0.01em] tabular-nums leading-none text-foreground">
            {getTimeAgo(job.createdAt)}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
            Posted
          </div>
        </div>
      </div>
    </article>
  );
}
