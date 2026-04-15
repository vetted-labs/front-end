"use client";

import {
  Award,
  Clock,
  AlertTriangle,
  Zap,
  Users,
  ArrowRight,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { STATUS_COLORS } from "@/config/colors";
import { getCandidateStatusDot } from "@/config/colors";
import { getPersonAvatar } from "@/lib/avatars";
import type { CompanyApplication } from "@/types";

interface CandidateOverviewPanelProps {
  allApplications: CompanyApplication[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    reviewing: number;
    interviewed: number;
  };
  getEndorsementCount: (app: CompanyApplication) => number;
  getMatchScore: (app: CompanyApplication) => number | undefined;
  onSelectApplication: (app: CompanyApplication) => void;
}

function getDaysAgo(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

type JobRow = { title: string; total: number; pending: number; reviewing: number; interviewed: number; accepted: number; endorsed: number };

function JobPipelineSection({ jobBreakdown }: { jobBreakdown: JobRow[] }) {
  const { paginatedItems, currentPage, totalPages, setCurrentPage } = useClientPagination(jobBreakdown, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground/60" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Pipeline by Job
        </h3>
        <span className="text-[10px] text-muted-foreground/40 tabular-nums">{jobBreakdown.length}</span>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 divide-y divide-border/20">
        {paginatedItems.map((job) => (
          <div key={job.title} className="px-4 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/50 tabular-nums">
                <span>{job.pending}n</span>
                <span>{job.reviewing}r</span>
                <span>{job.interviewed}i</span>
                <span>{job.accepted}a</span>
                {job.endorsed > 0 && (
                  <span className="text-positive font-medium">{job.endorsed} endorsed</span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground/50 tabular-nums flex-shrink-0">{job.total}</span>
            {/* Mini bar */}
            <div className="w-20 flex h-1.5 rounded-full overflow-hidden bg-muted/30 flex-shrink-0">
              {job.accepted > 0 && <div className={cn("h-full", getCandidateStatusDot("accepted"))} style={{ width: `${(job.accepted / job.total) * 100}%` }} />}
              {job.interviewed > 0 && <div className={cn("h-full", getCandidateStatusDot("interviewed"))} style={{ width: `${(job.interviewed / job.total) * 100}%` }} />}
              {job.reviewing > 0 && <div className={cn("h-full", getCandidateStatusDot("reviewing"))} style={{ width: `${(job.reviewing / job.total) * 100}%` }} />}
              {job.pending > 0 && <div className={cn("h-full", getCandidateStatusDot("pending"))} style={{ width: `${(job.pending / job.total) * 100}%` }} />}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors" aria-label="Previous">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">{currentPage} / {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors" aria-label="Next">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function CandidateOverviewPanel({
  allApplications,
  stats,
  getEndorsementCount,
  onSelectApplication,
}: CandidateOverviewPanelProps) {
  const endorsed = allApplications.filter((a) => getEndorsementCount(a) > 0);
  const staleReviewing = allApplications.filter(
    (a) =>
      (a.status === "reviewing" || a.status === "interviewed") &&
      getDaysAgo(a.statusChangedAt ?? a.appliedAt) >= 14
  );
  const rejected = allApplications.filter((a) => a.status === "rejected").length;

  // Per-job breakdown with status counts
  const jobData = new Map<string, { title: string; total: number; pending: number; reviewing: number; interviewed: number; accepted: number; endorsed: number }>();
  for (const app of allApplications) {
    const existing = jobData.get(app.jobId);
    const isEndorsed = getEndorsementCount(app) > 0;
    if (existing) {
      existing.total++;
      if (app.status === "pending") existing.pending++;
      if (app.status === "reviewing") existing.reviewing++;
      if (app.status === "interviewed") existing.interviewed++;
      if (app.status === "accepted") existing.accepted++;
      if (isEndorsed) existing.endorsed++;
    } else {
      jobData.set(app.jobId, {
        title: app.job.title,
        total: 1,
        pending: app.status === "pending" ? 1 : 0,
        reviewing: app.status === "reviewing" ? 1 : 0,
        interviewed: app.status === "interviewed" ? 1 : 0,
        accepted: app.status === "accepted" ? 1 : 0,
        endorsed: isEndorsed ? 1 : 0,
      });
    }
  }
  const jobBreakdown = [...jobData.values()].sort((a, b) => b.total - a.total);

  // Avg days in pipeline
  const reviewingApps = allApplications.filter(
    (a) => a.status === "reviewing" || a.status === "interviewed"
  );
  const avgDaysInPipeline =
    reviewingApps.length > 0
      ? Math.round(
          reviewingApps.reduce(
            (sum, a) => sum + getDaysAgo(a.statusChangedAt ?? a.appliedAt),
            0
          ) / reviewingApps.length
        )
      : 0;

  // Recent candidates (last 7 days)
  const recentApps = allApplications
    .filter((a) => getDaysAgo(a.appliedAt) <= 7)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  if (allApplications.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No candidates yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Candidates will appear here once they apply to your jobs
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Pipeline Overview
          </h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Select a candidate from the list to view details
          </p>
        </div>

        {/* Pipeline funnel */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "New", value: stats.pending, status: "pending" as const },
            { label: "Reviewing", value: stats.reviewing, status: "reviewing" as const },
            { label: "Interviewed", value: stats.interviewed, status: "interviewed" as const },
            { label: "Accepted", value: stats.accepted, status: "accepted" as const },
            { label: "Rejected", value: rejected, status: "rejected" as const },
          ].map((stage) => (
            <div
              key={stage.label}
              className="rounded-xl border border-border/40 bg-card/50 p-3 text-center"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    getCandidateStatusDot(stage.status)
                  )}
                />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stage.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {stage.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", STATUS_COLORS.positive.bgSubtle)}>
              <Award className={cn("w-4 h-4", STATUS_COLORS.positive.icon)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{endorsed.length}</p>
              <p className="text-[10px] text-muted-foreground/60">Expert Endorsed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3">
            <div className="w-9 h-9 rounded-lg bg-info-blue/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-info-blue" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{avgDaysInPipeline}d</p>
              <p className="text-[10px] text-muted-foreground/60">Avg. in Pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", staleReviewing.length > 0 ? STATUS_COLORS.warning.bgSubtle : "bg-muted/50")}>
              <AlertTriangle className={cn("w-4 h-4", staleReviewing.length > 0 ? STATUS_COLORS.warning.icon : "text-muted-foreground/40")} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{staleReviewing.length}</p>
              <p className="text-[10px] text-muted-foreground/60">Stale (&gt;2 weeks)</p>
            </div>
          </div>
        </div>

        {/* Needs Attention */}
        {staleReviewing.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("w-3.5 h-3.5", STATUS_COLORS.warning.icon)} />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Needs Attention
              </h3>
            </div>
            <div className="rounded-xl border border-warning/20 bg-warning/[0.03] divide-y divide-border/20">
              {staleReviewing.slice(0, 5).map((app) => (
                <button
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-warning/[0.04] transition-colors"
                >
                  <img
                    src={getPersonAvatar(app.candidate.fullName)}
                    alt=""
                    className="w-7 h-7 rounded-full bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {app.candidate.fullName}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50 truncate">
                      {app.job.title} &middot; {getDaysAgo(app.statusChangedAt ?? app.appliedAt)} days in {app.status}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Per-Job Pipeline Breakdown */}
        <JobPipelineSection jobBreakdown={jobBreakdown} />

        {/* Recent Applications */}
        {recentApps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Applied This Week
              </h3>
              <span className="text-[10px] text-muted-foreground/40 tabular-nums">{recentApps.length}</span>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/50 divide-y divide-border/20">
              {recentApps.slice(0, 8).map((app) => (
                <button
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
                >
                  <img
                    src={getPersonAvatar(app.candidate.fullName)}
                    alt=""
                    className="w-7 h-7 rounded-full bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {app.candidate.fullName}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50 truncate">
                      {app.job.title}
                    </p>
                  </div>
                  {getEndorsementCount(app) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-positive bg-positive/10 border border-positive/20 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      <Award className="w-3 h-3" />
                      {getEndorsementCount(app)}
                    </span>
                  )}
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getCandidateStatusDot(app.status))} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick action */}
        {stats.pending > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {stats.pending} new application{stats.pending !== 1 ? "s" : ""} to review
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                Use Fast Review to quickly triage new candidates
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
