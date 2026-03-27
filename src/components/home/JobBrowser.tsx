"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Briefcase,
  Clock,
} from "lucide-react";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/types";

interface JobBrowserProps {
  jobs: Job[];
  isLoadingJobs: boolean;
}

/**
 * Decorative guild identity dots for job cards.
 * These are per-discipline brand identifiers (like brand logos), not status indicators.
 */
const GUILD_DOT_STYLES: Record<string, string> = {
  engineering: "bg-[#60a5fa]",
  design: "bg-[#c084fc]",
  "data science": "bg-[#2dd4bf]",
  data: "bg-[#2dd4bf]",
  security: "bg-[#f87171]",
  marketing: "bg-[#fbbf24]",
  devops: "bg-[#4ade80]",
};

function getGuildDotStyle(guildName: string): string {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").trim();
  return GUILD_DOT_STYLES[key] ?? "bg-primary";
}

export function JobBrowser({ jobs, isLoadingJobs }: JobBrowserProps) {
  const router = useRouter();
  const displayedJobs = jobs.slice(0, 6);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl sm:text-2xl tracking-tight text-foreground">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "400ms" }}>
          {displayedJobs.map((job) => {
            const salary = (job.salary.min || job.salary.max) ? formatSalaryRange(job.salary) : null;
            const guildName = job.guild?.replace(/ Guild$/i, "") ?? "";
            const tags: string[] = [];
            if (job.skills && job.skills.length > 0) {
              tags.push(...job.skills.slice(0, 3));
            } else {
              if (job.type) tags.push(job.type);
              if (job.locationType) tags.push(job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1));
            }

            return (
              <div
                key={job.id}
                onClick={() => router.push(`/browse/jobs/${job.id}`)}
                className="bg-card border border-border rounded-lg p-6 cursor-pointer group hover:border-border hover:bg-card hover:-translate-y-px transition-all duration-250"
              >
                {/* Top meta */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium text-muted-foreground/50 uppercase tracking-[0.06em]">
                    {job.companyName || "Company"}
                  </span>
                  {guildName && (
                    <span className={`w-[7px] h-[7px] rounded-full ${getGuildDotStyle(guildName)}`} />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-display font-bold text-sm tracking-tight text-foreground leading-snug mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {job.title}
                </h3>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3.5">
                    {tags.map((tag) => (
                      <span key={tag} className="text-xs font-medium px-2 py-0.5 rounded bg-muted/30 text-muted-foreground/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/20">
                  {salary ? (
                    <span className="text-sm font-medium text-foreground">{salary}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Competitive</span>
                  )}
                  <span className="text-xs text-muted-foreground/50 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(job.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border/30">
          <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
            <Briefcase className="w-8 h-8 text-muted-foreground/40" />
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
