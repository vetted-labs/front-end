"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CheckCircle2,
  Star,
  Users,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { getAssetUrl } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { STATUS_COLORS } from "@/config/colors";
import { GuildBadge } from "@/components/ui/guild";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { getTimeAgo, formatSalaryRange, cn } from "@/lib/utils";
import { MatchScoreBadge } from "@/components/ui/match-score-badge";
import type { Job } from "@/types";

interface JobCardProps {
  job: Job;
  hasApplied: boolean;
  showAppliedBadge: boolean;
  matchScore?: number;
}

export function JobCard({ job, hasApplied, showAppliedBadge, matchScore }: JobCardProps) {
  const router = useRouter();
  const { resolveGuildId } = useGuilds();
  const heroUrl = job.heroImageUrl ? getAssetUrl(job.heroImageUrl) : null;
  const questionCount = job.applicationQuestions?.length ?? 0;

  return (
    <Link
      href={`/browse/jobs/${job.id}`}
      className={cn(
        "block bg-card rounded-xl hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 cursor-pointer border border-border group relative overflow-hidden",
        job.featured && "ring-1 ring-warning/40"
      )}
    >
      {/* Hero strip */}
      <div className="relative h-28 overflow-hidden">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
          <img
            src={heroUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        {job.featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/90 text-warning-foreground text-[10px] font-bold uppercase tracking-wider">
            <Star className="w-2.5 h-2.5 fill-current" />
            Featured
          </span>
        )}
      </div>

      <div className="p-6 pt-4">
      {/* Hover gradient border overlay */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-primary/[0.04]" />

      {/* Card Header: Company info + posted time */}
      <div className="flex items-start justify-between mb-3.5 relative">
        <div className="flex items-center gap-3">
          {/* Company Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.companyLogo ? getAssetUrl(job.companyLogo) : getCompanyAvatar(job.companyName)}
            alt={job.companyName || "Company"}
            className="w-10 h-10 rounded-lg object-contain border border-border flex-shrink-0 bg-white p-1"
            onError={(e) => {
              e.currentTarget.src = getCompanyAvatar(job.companyName);
            }}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {job.companyName || "Company"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/60 whitespace-nowrap mt-1">
          {getTimeAgo(job.createdAt)}
        </span>
      </div>

      {/* Job Title */}
      <h3 className="font-display text-xl font-bold text-foreground mb-3 tracking-tight leading-snug group-hover:text-primary transition-colors">
        {job.title}
      </h3>

      {/* Applied Badge (if applicable) */}
      {showAppliedBadge && hasApplied && (
        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-medium mb-3 ${STATUS_COLORS.positive.badge}`}>
          <CheckCircle2 className="w-3 h-3" />
          Applied
        </span>
      )}
      {/* Match Score Badge */}
      {matchScore !== undefined && (
        <div className="mb-3">
          <MatchScoreBadge score={matchScore} compact />
        </div>
      )}

      {/* Meta Tags: Guild badge, location, job type */}
      <div className="flex items-center gap-2 flex-wrap mb-3.5">
        {job.guild && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const guildUuid = resolveGuildId(job.guild!);
              if (guildUuid) router.push(`/guilds/${guildUuid}`);
            }}
            className="rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={`Open ${job.guild} guild`}
          >
            <GuildBadge guild={job.guild} size="sm" />
          </button>
        )}
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
          <MapPin className="w-3 h-3 opacity-60" />
          {job.locationType || job.location}
        </span>
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
          <VettedIcon name="job" className="w-3 h-3 opacity-60" />
          {job.type}
        </span>
      </div>

      {/* Salary */}
      {(job.salary.min || job.salary.max) && (
        <div className="text-sm font-bold text-primary mb-3.5 tracking-tight">
          {formatSalaryRange(job.salary)}
          <span className="text-xs font-normal text-muted-foreground/50 ml-1">
            /year
          </span>
        </div>
      )}

      {/* Skills Row */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {job.skills.slice(0, 5).map((skill, index) => (
            <span
              key={index}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/20 border border-border transition-colors hover:text-foreground hover:bg-muted/40"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="px-2.5 py-1 text-xs text-muted-foreground/60">
              +{job.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Applicants + Apply Button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 opacity-50" />
            {job.applicants || 0} applicants
          </span>
          {questionCount > 0 && (
            <span className="flex items-center gap-1.5" title="Custom application questions">
              <HelpCircle className="w-3.5 h-3.5 opacity-50" />
              {questionCount} question{questionCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm group-hover:shadow-md group-hover:-translate-y-px transition-all">
          Apply
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
      </div>
    </Link>
  );
}
