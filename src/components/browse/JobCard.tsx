"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Building2,
  CheckCircle2,
  Star,
  Users,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { STATUS_COLORS, getGuildBadgeColors } from "@/config/colors";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
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
  const guildColors = job.guild ? getGuildBadgeColors(job.guild) : null;

  return (
    <Link
      href={`/browse/jobs/${job.id}`}
      className={`block bg-card rounded-xl p-6 hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 cursor-pointer border border-border group relative overflow-hidden ${
        job.featured ? "border-t-2 border-t-warning" : ""
      }`}
    >
      {/* Hover gradient border overlay */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-primary/[0.04]" />

      {/* Featured Badge */}
      {job.featured && (
        <div className="flex items-center gap-2 text-warning text-xs font-medium uppercase tracking-wider mb-3">
          <Star className="w-3 h-3 fill-current" />
          Featured
        </div>
      )}

      {/* Card Header: Company info + posted time */}
      <div className="flex items-start justify-between mb-3.5 relative">
        <div className="flex items-center gap-3">
          {/* Company Logo */}
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
        {guildColors && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const guildUuid = resolveGuildId(job.guild!);
              if (guildUuid) router.push(`/guilds/${guildUuid}`);
            }}
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide border ${guildColors.bg} ${guildColors.text} ${guildColors.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${guildColors.dot}`} />
            {job.guild?.replace(/ Guild$/i, "")}
          </button>
        )}
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
          <MapPin className="w-3 h-3 opacity-60" />
          {job.locationType || job.location}
        </span>
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
          <Briefcase className="w-3 h-3 opacity-60" />
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <Users className="w-3.5 h-3.5 opacity-50" />
          {job.applicants || 0} applicants
        </div>
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm group-hover:shadow-md group-hover:-translate-y-px transition-all">
          Apply
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
