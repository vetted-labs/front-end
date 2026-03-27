"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  MapPin,
  DollarSign,
  Calendar,
  Check,
  Circle,
  X,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { Pagination } from "@/components/ui/pagination";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { CandidateApplication, ApplicationStatus } from "@/types";
import { formatSalaryRange } from "@/lib/utils";

/* ── Vetting Pipeline Steps ── */

const PIPELINE_STEPS = [
  { key: "applied",        label: "Applied" },
  { key: "expert_review",  label: "Expert Review" },
  { key: "company_review", label: "Company Review" },
  { key: "interview",      label: "Interview" },
  { key: "offer",          label: "Offer" },
] as const;

function getStepIndex(status: ApplicationStatus): number {
  switch (status) {
    case "pending":      return 0; // Applied
    case "reviewing":    return 1; // Expert Review
    case "interviewed":  return 3; // Interview
    case "accepted":     return 4; // Offer
    case "rejected":     return -1;
    default:             return 0;
  }
}

/** Where in the pipeline the rejection occurred */
function getRejectedAtIndex(status: ApplicationStatus): number {
  // Without more granular rejection info, assume it happened at the
  // reviewing step (most common). The pipeline shows completed steps
  // before the rejection point.
  if (status === "rejected") return 2; // failed at Company Review
  return -1;
}

function VettingPipeline({ status }: { status: ApplicationStatus }) {
  const isRejected = status === "rejected";
  const currentStep = getStepIndex(status);
  const rejectedAt = getRejectedAtIndex(status);

  return (
    <div className="py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-2.5">
        Vetting Progress
      </p>
      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, i) => {
          let nodeState: "completed" | "active" | "rejected" | "pending";

          if (isRejected) {
            if (i < rejectedAt) nodeState = "completed";
            else if (i === rejectedAt) nodeState = "rejected";
            else nodeState = "pending";
          } else {
            if (i < currentStep) nodeState = "completed";
            else if (i === currentStep) nodeState = "active";
            else nodeState = "pending";
          }

          // Determine connector state
          let connectorState: "completed" | "active" | "pending" = "pending";
          if (!isRejected) {
            if (i < currentStep) connectorState = "completed";
            else if (i === currentStep) connectorState = "active";
          } else {
            if (i < rejectedAt) connectorState = "completed";
          }

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none relative">
              {/* Node */}
              <div className="relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    nodeState === "completed"
                      ? STATUS_COLORS.positive.bgSubtle + " " + STATUS_COLORS.positive.text + ""
                      : nodeState === "active"
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : nodeState === "rejected"
                          ? STATUS_COLORS.negative.bgSubtle + " " + STATUS_COLORS.negative.text + ""
                          : "bg-muted/40 border border-border text-muted-foreground/40"
                  }`}
                >
                  {nodeState === "completed" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : nodeState === "active" ? (
                    <Circle className="w-2.5 h-2.5 fill-current" />
                  ) : nodeState === "rejected" ? (
                    <X className="w-3.5 h-3.5" />
                  ) : null}
                </div>
                {/* Label below node */}
                <span className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium ${
                  nodeState === "active" ? "text-primary font-semibold"
                    : nodeState === "completed" ? "text-muted-foreground"
                    : nodeState === "rejected" ? STATUS_COLORS.negative.text
                    : "text-muted-foreground/40"
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[16px] mx-1 ${
                  connectorState === "completed"
                    ? "bg-positive/40"
                    : connectorState === "active"
                      ? "bg-positive/30"
                      : "bg-border/30"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Filter types ── */

type FilterStatus = "all" | ApplicationStatus;

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "pending",      label: "Applied" },
  { value: "reviewing",    label: "Under Review" },
  { value: "interviewed",  label: "Interview" },
  { value: "accepted",     label: "Offered" },
  { value: "rejected",     label: "Rejected" },
];

/* ── Status accent bar color ── */

function getAccentColor(status: ApplicationStatus): string {
  switch (status) {
    case "pending":     return "bg-info-blue";
    case "reviewing":   return "bg-primary";
    case "interviewed": return "bg-positive";
    case "accepted":    return "bg-warning";
    case "rejected":    return "bg-negative";
    default:            return "bg-muted";
  }
}

export default function CandidateApplications() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const { data: applicationsData, isLoading } = useFetch(
    () => applicationsApi.getAll(),
    { skip: !ready }
  );

  const applications: CandidateApplication[] = applicationsData?.applications || [];

  // Compute stats from all applications
  const stats = {
    total:       applications.length,
    reviewing:   applications.filter(a => a.status === "reviewing").length,
    interviewed: applications.filter(a => a.status === "interviewed").length,
    accepted:    applications.filter(a => a.status === "accepted").length,
  };

  // Apply filter
  const filteredApplications = filter === "all"
    ? applications
    : applications.filter(a => a.status === filter);

  const {
    paginatedItems: paginatedApplications,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useClientPagination(filteredApplications, 10);

  const activeCount = applications.filter(a => a.status !== "rejected").length;

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-full relative">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            My Applications
          </h1>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {activeCount} active
            </span>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {/* Total Applied */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Total Applied</p>
            <p className="text-2xl font-display font-bold text-foreground tabular-nums">{stats.total}</p>
          </div>
          {/* Under Review */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Under Review</p>
            <p className={`text-2xl font-display font-bold tabular-nums ${STATUS_COLORS.info.text}`}>{stats.reviewing}</p>
          </div>
          {/* Interviews */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Interviews</p>
            <p className={`text-2xl font-display font-bold tabular-nums ${STATUS_COLORS.positive.text}`}>{stats.interviewed}</p>
          </div>
          {/* Offers -- gold glow */}
          <div className="rounded-xl border border-warning/20 bg-card px-5 py-4 hover:-translate-y-0.5 transition-transform relative overflow-hidden">
            <div className="absolute inset-0 bg-transparent pointer-events-none rounded-xl" />
            <p className="relative text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Offers</p>
            <p className="relative text-2xl font-display font-bold tabular-nums text-warning">{stats.accepted}</p>
          </div>
        </div>

        {/* ── Filter Pills ── */}
        <div className="flex items-center gap-2 mb-7 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all select-none ${
                filter === opt.value
                  ? "bg-primary/10 text-primary border-primary/25"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground hover:border-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Application Cards ── */}
        {filteredApplications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Send className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {filter === "all" ? "No applications yet" : "No applications in this category"}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              {filter === "all" ? "Start applying to jobs to see them here" : "Try a different filter to see your applications"}
            </p>
            {filter === "all" && (
              <button
                onClick={() => router.push("/browse/jobs")}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-sm font-semibold"
              >
                Browse Jobs
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {paginatedApplications.map((application) => {
              const statusStyle = APPLICATION_STATUS_CONFIG[application.status] || APPLICATION_STATUS_CONFIG.pending;
              const companyInitial = application.job.companyName ? application.job.companyName[0].toUpperCase() : "?";
              const accentColor = getAccentColor(application.status);

              return (
                <div
                  key={application.id}
                  className="rounded-xl border border-border bg-card overflow-hidden hover:-translate-y-0.5 hover:border-border hover:shadow-lg transition-all group"
                >
                  <div className="grid grid-cols-[6px_1fr]">
                    {/* Accent bar */}
                    <div className={`rounded-l-2xl ${accentColor}`} />

                    <div className="px-6 py-5">
                      {/* Top row: company + status badge */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {companyInitial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">
                              {application.job.companyName || "Company"}
                            </p>
                            <h3 className="text-sm font-display font-bold text-foreground truncate max-w-[520px] group-hover:text-primary transition-colors">
                              {application.job.title}
                            </h3>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${statusStyle.className}`}>
                          <span className={`w-[7px] h-[7px] rounded-full ${
                            application.status === "accepted" ? "bg-warning"
                              : application.status === "rejected" ? STATUS_COLORS.negative.dot
                              : application.status === "interviewed" ? STATUS_COLORS.positive.dot
                              : application.status === "reviewing" ? STATUS_COLORS.info.dot
                              : STATUS_COLORS.pending.dot
                          }`} />
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Meta tags */}
                      <div className="flex items-center gap-3.5 flex-wrap mb-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 opacity-50" />
                          Applied {new Date(application.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 opacity-50" />
                          {application.job.location}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs border border-border bg-muted/30">
                          {application.job.type}
                        </span>
                        {application.job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 opacity-50" />
                            {formatSalaryRange(application.job.salary)}
                          </span>
                        )}
                      </div>

                      {/* Vetting Pipeline */}
                      <VettingPipeline status={application.status} />

                      {/* Bottom: skills + actions */}
                      <div className="flex items-center justify-between gap-4 flex-wrap pt-4 border-t border-border/30 mt-2">
                        {/* Skills match dots */}
                        {application.job.skills && application.job.skills.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {application.job.skills.slice(0, 5).map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`w-2 h-2 rounded-full ${STATUS_COLORS.positive.bg}`}
                                />
                              ))}
                              {application.job.skills.length > 5 && (
                                Array.from({ length: Math.min(application.job.skills.length - 5, 3) }).map((_, idx) => (
                                  <div key={`un-${idx}`} className="w-2 h-2 rounded-full bg-muted/40" />
                                ))
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">
                              {Math.min(application.job.skills.length, 5)}/{application.job.skills.length} skills
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => router.push(`/browse/jobs/${application.job.id}`)}
                            className="px-4 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground shadow-[0_2px_10px_hsl(var(--primary)/0.25)] hover:shadow-[0_4px_16px_hsl(var(--primary)/0.35)] hover:-translate-y-px transition-all"
                          >
                            {application.status === "accepted" ? "View Offer" : "View Details"}
                          </button>
                          {application.status !== "accepted" && application.status !== "rejected" && (
                            <button
                              onClick={() => router.push(`/browse/jobs/${application.job.id}`)}
                              className={`px-4 py-2 rounded-md text-xs font-semibold border bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground hover:border-border transition-all`}
                            >
                              View Job
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
