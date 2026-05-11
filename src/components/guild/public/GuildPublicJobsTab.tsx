"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronDown, Clock, Users, CheckCircle2, Zap, Pin } from "lucide-react";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { formatTimeAgo, formatSalaryRange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { Job } from "@/types";

type StatusFilter = "all" | "open" | "reviewing" | "filled";

interface GuildPublicJobsTabProps {
  jobs: Job[];
  guildName: string;
  /** Falls back to jobs.length when omitted. */
  jobsCount?: number;
}

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "filled", label: "Filled" },
];

function classifyJobStatus(job: Job): "open" | "reviewing" | "filled" {
  // Best-effort mapping from the backend Job.status to the public-mock buckets.
  if (job.status === "closed") return "filled";
  if (job.status === "paused") return "reviewing";
  return "open";
}

function getStatusPillClasses(status: "open" | "reviewing" | "filled") {
  switch (status) {
    case "filled":
      return "bg-surface-2 text-muted-foreground border-surface-border";
    case "reviewing":
      return "bg-warning/[0.12] text-warning border-warning/25";
    default:
      return "bg-positive/[0.12] text-positive border-positive/25";
  }
}

function statusLabel(status: "open" | "reviewing" | "filled") {
  return status === "open" ? "Open" : status === "reviewing" ? "Reviewing" : "Filled";
}

export function GuildPublicJobsTab({
  jobs,
  guildName,
  jobsCount,
}: GuildPublicJobsTabProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<"recent" | "stake" | "applicants">("recent");

  const identity = getGuildIdentity(guildName);

  const filteredJobs = useMemo(() => {
    const base = filter === "all"
      ? jobs
      : jobs.filter((j) => classifyJobStatus(j) === filter);

    const sorted = [...base];
    if (sort === "recent") {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sort === "applicants") {
      sorted.sort((a, b) => (b.applicants ?? 0) - (a.applicants ?? 0));
    }
    return sorted;
  }, [jobs, filter, sort]);

  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const hasMore = filteredJobs.length > visibleCount;
  const remaining = Math.max(0, filteredJobs.length - visibleCount);
  const headerTotal = jobsCount ?? jobs.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">
      <div>
        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {STATUS_CHIPS.map((c) => {
            const isActive = filter === c.value;
            const count =
              c.value === "all"
                ? jobs.length
                : jobs.filter((j) => classifyJobStatus(j) === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-3 py-1.5 rounded-full border text-xs inline-flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-primary/[0.12] border-primary/35 text-primary font-semibold"
                    : "bg-surface-1 border-surface-border text-muted-foreground hover:border-surface-border-strong hover:text-foreground"
                }`}
              >
                {c.label}
                {count > 0 && <span className="opacity-70">· {count}</span>}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[13px] text-muted-foreground">
            <strong className="text-foreground">{headerTotal} {headerTotal === 1 ? "role" : "roles"}</strong>{" "}
            reviewed by {identity.shortName}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-surface-1 border border-surface-border rounded-lg px-3 py-1.5">
            Sort:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent text-foreground font-medium focus:outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="applicants">Most applicants</option>
            </select>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No roles in this view"
            description={
              jobs.length === 0
                ? `No open roles in ${guildName} yet — check back soon.`
                : "No roles match the current filter."
            }
            className="py-16"
          />
        ) : (
          <div>
            {visibleJobs.map((job, idx) => {
              const status = classifyJobStatus(job);
              const isFeatured = idx === 0 && filter === "all" && sort === "recent" && job.featured;
              const logoLetter = (job.companyName || job.title || "?")
                .trim()
                .slice(0, 1)
                .toUpperCase();
              const reviewersHint = Math.max(3, ((job.applicants ?? 6) % 12) + 3);
              const stakeHint = 100 + ((job.applicants ?? 0) % 5) * 100;

              return (
                <div
                  key={job.id}
                  className={`grid grid-cols-[48px_1fr_auto] gap-4 items-start rounded-[14px] border px-5 py-[18px] mb-3 transition-colors hover:border-surface-border-strong ${
                    isFeatured
                      ? "border-primary/35 bg-gradient-to-b from-primary/[0.06] to-surface-1"
                      : "border-surface-border bg-surface-1"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-[10px] border border-surface-border flex items-center justify-center font-bold text-muted-foreground ${
                      isFeatured ? "bg-primary/[0.15] text-primary" : "bg-surface-2"
                    }`}
                  >
                    {logoLetter}
                  </div>

                  <div className="min-w-0">
                    {isFeatured && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-primary mb-1.5">
                        <Pin className="w-3 h-3" />
                        Featured
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display text-[17px] text-foreground">
                        {job.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.06em] border ${getStatusPillClasses(status)}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </div>
                    <div className="text-[13px] text-muted-foreground mb-2">
                      {job.companyName || "Vetted partner"}
                      {job.location ? ` · ${job.location}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {(job.skills || []).slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-[3px] rounded-md bg-surface-2 border border-surface-border text-[11px] text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                      {!!job.experienceLevel && (
                        <span className="px-2.5 py-[3px] rounded-md bg-surface-2 border border-surface-border text-[11px] text-muted-foreground">
                          {job.experienceLevel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3.5 flex-wrap text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Posted {formatTimeAgo(job.createdAt)}
                      </span>
                      {(job.applicants ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {job.applicants} applicants
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${identity.classes.text}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Reviewed by {reviewersHint} guild members
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {(job.salary.min || job.salary.max) && (
                      <div className="font-display text-[17px] text-foreground whitespace-nowrap">
                        {formatSalaryRange(job.salary)}
                      </div>
                    )}
                    <div className={`text-[11px] inline-flex items-center gap-1 ${
                      isFeatured ? identity.classes.text : "text-muted-foreground"
                    }`}>
                      <Zap className="w-3 h-3" />
                      {stakeHint} VETD stake
                    </div>
                    <button
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isFeatured
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "bg-surface-2 border border-surface-border text-foreground hover:bg-surface-3"
                      }`}
                    >
                      View role
                    </button>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-3">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-foreground hover:bg-surface-3"
                >
                  Show {remaining} more {remaining === 1 ? "role" : "roles"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
            Earn from reviews
          </span>
          <div className="font-display text-[28px] text-primary mt-2 mb-1">
            $280
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            avg per review · paid in stablecoin on consensus
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Highest single fee this month:{" "}
            <strong className="text-foreground">$1,200</strong>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">
            Hot stack in {identity.shortName}
          </span>
          {(() => {
            // Aggregate top skills across the visible jobs.
            const counts: Record<string, number> = {};
            jobs.forEach((j) =>
              (j.skills || []).forEach((s) => {
                counts[s] = (counts[s] || 0) + 1;
              }),
            );
            const top = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);
            if (top.length === 0) {
              return (
                <p className="text-xs text-muted-foreground">
                  Skill trends will appear once roles are posted.
                </p>
              );
            }
            return top.map(([skill, count], i) => (
              <div
                key={skill}
                className={`flex items-center justify-between py-2 text-sm ${
                  i < top.length - 1 ? "border-b border-surface-border" : ""
                }`}
              >
                <span className="font-medium text-foreground">{skill}</span>
                <span className="text-[11px] text-muted-foreground">
                  {count} open
                </span>
              </div>
            ));
          })()}
        </div>
      </aside>
    </div>
  );
}
