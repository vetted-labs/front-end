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
  engineering: "bg-[#60a5fa] shadow-[0_0_6px_rgba(96,165,250,0.4)]",
  design: "bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.4)]",
  "data science": "bg-[#2dd4bf] shadow-[0_0_6px_rgba(45,212,191,0.4)]",
  data: "bg-[#2dd4bf] shadow-[0_0_6px_rgba(45,212,191,0.4)]",
  security: "bg-[#f87171] shadow-[0_0_6px_rgba(248,113,113,0.4)]",
  marketing: "bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.4)]",
  devops: "bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]",
};

function getGuildDotStyle(guildName: string): string {
  const key = guildName.toLowerCase().replace(/ guild$/i, "").trim();
  return GUILD_DOT_STYLES[key] ?? "bg-primary shadow-[0_0_6px_rgba(249,115,22,0.4)]";
}

export function JobBrowser({ jobs, isLoadingJobs }: JobBrowserProps) {
  const router = useRouter();
  const displayedJobs = jobs.slice(0, 6);

  return (
    <section className="max-w-[1120px] mx-auto px-6 pb-20 pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl sm:text-2xl tracking-tight text-foreground">
          Featured Jobs
        </h2>
        <button
          onClick={() => router.push("/browse/jobs")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-fade-up" style={{ animationDelay: "400ms" }}>
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
                className="bg-card/30 border border-border/40 rounded-[10px] p-5 cursor-pointer group hover:border-border/80 hover:bg-card/60 hover:-translate-y-px transition-all duration-250"
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
                  <div className="flex gap-1.5 flex-wrap mb-3.5">
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
                  <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(job.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-card/20 rounded-2xl border border-border/30">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
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
