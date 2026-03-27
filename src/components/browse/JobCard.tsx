"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Building2,
  CheckCircle2,
  Star,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { STATUS_COLORS } from "@/config/colors";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/types";

interface JobCardProps {
  job: Job;
  hasApplied: boolean;
  showAppliedBadge: boolean;
}

export function JobCard({ job, hasApplied, showAppliedBadge }: JobCardProps) {
  const router = useRouter();
  const { resolveGuildId } = useGuilds();

  return (
    <Link
      href={`/browse/jobs/${job.id}`}
      className="block bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-border/60 group relative"
    >
      {/* Posted Date - Top Right Corner */}
      <div className="absolute top-4 right-5 text-xs text-muted-foreground">
        {getTimeAgo(job.createdAt)}
      </div>

      <div className="flex gap-5">
        {/* Company Logo - Left Side */}
        <div className="flex-shrink-0">
          {job.companyLogo ? (
            <img
              src={getAssetUrl(job.companyLogo)}
              alt={job.companyName || "Company"}
              className="w-16 h-16 rounded-lg object-cover border border-border"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-16 h-16 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center ${job.companyLogo ? "hidden" : "flex"}`}
          >
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Job Content */}
        <div className="flex-1 min-w-0">
          {/* Job Title and Featured Badge */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                {job.featured && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 ${STATUS_COLORS.warning.bg} text-white rounded text-xs font-bold`}>
                    <Star className="w-3 h-3 fill-white" />
                    FEATURED
                  </span>
                )}
                {showAppliedBadge && hasApplied && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${STATUS_COLORS.positive.badge}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    Applied
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Company Name and Location on same line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
            {job.companyName && (
              <span className="font-medium text-foreground">
                {job.companyName}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {job.location}
              {job.locationType &&
                job.locationType.toLowerCase() !==
                  job.location.toLowerCase() && (
                  <span className="capitalize"> &bull; {job.locationType}</span>
                )}
            </span>
          </div>

          {/* Tags: Guild, Job Type, Salary */}
          <div className="flex flex-wrap items-center gap-2">
            {job.guild && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const guildUuid = resolveGuildId(job.guild!);
                  if (guildUuid) router.push(`/guilds/${guildUuid}`);
                }}
                className="px-2.5 py-1 bg-muted/50 text-foreground border border-border/60 rounded-md text-xs font-medium hover:bg-muted transition-colors"
              >
                {job.guild}
              </button>
            )}
            <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-md text-xs font-medium">
              {job.type}
            </span>
            {(job.salary.min || job.salary.max) && (
              <span className="px-2.5 py-1 bg-muted/50 text-foreground rounded-md text-xs font-semibold">
                {formatSalaryRange(job.salary)}
              </span>
            )}
            {job.experienceLevel && (
              <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-md text-xs font-medium capitalize">
                {job.experienceLevel}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {job.skills.slice(0, 5).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-muted/30 text-muted-foreground rounded-md text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {job.skills.length > 5 && (
                  <span className="px-2 py-0.5 text-muted-foreground text-xs">
                    +{job.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
