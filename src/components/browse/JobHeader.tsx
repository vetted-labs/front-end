import {
  Building2,
  MapPin,
  Briefcase,
  Clock,
  Users,
  DollarSign,
  Code2,
  Globe,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getGuildBadgeColors } from "@/config/colors";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
import { Divider } from "@/components/ui/divider";
import type { Job } from "@/types";

interface JobHeaderProps {
  job: Job;
}

export default function JobHeader({ job }: JobHeaderProps) {
  const guildColors = job.guild ? getGuildBadgeColors(job.guild) : null;

  return (
    <div className="pb-0">
      {/* Company Row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {job.companyLogo ? (
            <img
              src={getAssetUrl(job.companyLogo)}
              alt={job.companyName || "Company"}
              className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0 shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              {job.companyName || "Company"}
            </span>
            <span className="text-xs text-muted-foreground">{job.department || job.type}</span>
          </div>
        </div>
      </div>

      {/* Job Title */}
      <h1 className="font-display text-3xl sm:text-3xl font-bold tracking-tight leading-[1.15] mb-4 text-foreground">
        {job.title}
      </h1>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-primary/[0.08] border border-primary/20 text-primary">
          <Briefcase className="w-3 h-3" />
          {job.type}
        </span>
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-positive/[0.08] border border-positive/20 text-positive">
          <Globe className="w-3 h-3" />
          {job.locationType ? job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1) : "Remote"}
        </span>
        {guildColors && (
          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium ${guildColors.bg} border ${guildColors.border} ${guildColors.text}`}>
            <Code2 className="w-3 h-3" />
            {job.guild}
          </span>
        )}
      </div>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-4 pt-5 border-t border-border">
        {job.salary?.min && job.salary?.max && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-positive">
              <DollarSign className="w-3.5 h-3.5" />
              {formatSalaryRange(job.salary)}
              {job.equityOffered && (
                <span className="text-primary font-medium ml-1">
                  + Equity
                </span>
              )}
            </div>
            <Divider orientation="vertical" className="h-3.5" />
          </>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
          Posted {getTimeAgo(job.createdAt)}
        </div>
        <Divider orientation="vertical" className="h-3.5" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
          {job.applicants || 0} applicants
        </div>
        {job.location && (
          <>
            <Divider orientation="vertical" className="h-3.5" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
              {job.location}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
