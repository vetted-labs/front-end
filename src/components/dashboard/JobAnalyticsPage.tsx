"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { useFetch } from "@/lib/hooks/useFetch";
import { jobsApi, applicationsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS } from "@/config/colors";
import { formatTimeAgo, formatSalaryRange } from "@/lib/utils";
import type { CompanyApplication } from "@/types";

export default function JobAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = typeof params?.jobId === "string" ? params.jobId : "";

  const { data: job, isLoading: loadingJob } = useFetch(
    () => jobsApi.getById(jobId),
    { skip: !jobId }
  );

  const { data: appsResult, isLoading: loadingApps } = useFetch(
    () => applicationsApi.getJobApplications(jobId, {}),
    { skip: !jobId }
  );

  const isLoading = loadingJob || loadingApps;

  const applications: CompanyApplication[] = useMemo(() => {
    if (!appsResult) return [];
    if (Array.isArray(appsResult)) return appsResult;
    return (appsResult as { applications?: CompanyApplication[] }).applications ?? [];
  }, [appsResult]);

  const analytics = useMemo(() => {
    const total = applications.length;
    const byStatus: Record<string, number> = {};
    applications.forEach((app) => {
      const s = app.status || "pending";
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    const accepted = byStatus["accepted"] ?? 0;
    const rejected = byStatus["rejected"] ?? 0;
    const reviewing = byStatus["reviewing"] ?? byStatus["in_review"] ?? 0;
    const interviewed = byStatus["interviewed"] ?? 0;
    const pending = byStatus["pending"] ?? 0;
    return {
      total,
      byStatus,
      accepted,
      rejected,
      reviewing,
      interviewed,
      pending,
      conversionRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : "0",
    };
  }, [applications]);

  const pipeline = useMemo(
    () => [
      {
        label: "Pending",
        count: analytics.pending,
        color: STATUS_COLORS.warning,
      },
      {
        label: "Reviewing",
        count: analytics.reviewing,
        color: STATUS_COLORS.info,
      },
      {
        label: "Interviewed",
        count: analytics.interviewed,
        color: STATUS_COLORS.pending,
      },
      {
        label: "Accepted",
        count: analytics.accepted,
        color: STATUS_COLORS.positive,
      },
      {
        label: "Rejected",
        count: analytics.rejected,
        color: STATUS_COLORS.negative,
      },
    ],
    [analytics]
  );

  const backUrl = "/dashboard/analytics";

  if (!isLoading && !job) {
    return (
      <div className="p-6">
        <Button variant="outline" size="sm" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Analytics
        </Button>
        <div className="mt-8">
          <EmptyState
            icon={Briefcase}
            title="Job not found"
            description="This job listing could not be loaded."
            action={{ label: "Back to Analytics", onClick: () => router.push(backUrl) }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back + Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            className="mb-4"
            onClick={() => router.push(backUrl)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Analytics
          </Button>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground">{job?.title}</h1>
              <p className="text-muted-foreground mt-1">
                {[job?.department, job?.createdAt ? `Posted ${formatTimeAgo(job.createdAt)}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[14px] border bg-card p-6">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-64 rounded-[14px]" />
            <Skeleton className="h-48 rounded-[14px]" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Total Applicants",
                  value: String(analytics.total),
                  icon: Users,
                  color: "text-primary",
                },
                {
                  label: "Accepted",
                  value: String(analytics.accepted),
                  icon: CheckCircle,
                  color: STATUS_COLORS.positive.text,
                },
                {
                  label: "In Review",
                  value: String(analytics.reviewing + analytics.interviewed),
                  icon: Clock,
                  color: STATUS_COLORS.info.text,
                },
                {
                  label: "Conversion Rate",
                  value: `${analytics.conversionRate}%`,
                  icon: TrendingUp,
                  color: STATUS_COLORS.positive.text,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[14px] border bg-card p-6 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <kpi.icon className="w-9 h-9 text-primary/15 mt-1 shrink-0" />
                </div>
              ))}
            </div>

            {/* Application Pipeline */}
            <div className="rounded-[14px] border bg-card p-6 mb-6">
              <h3 className="text-xl font-bold text-foreground mb-6">Application Pipeline</h3>
              {analytics.total === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No applications yet"
                  description="Applications will appear here once candidates start applying."
                />
              ) : (
                <div className="space-y-4">
                  {pipeline.map((stage) => {
                    const pct =
                      analytics.total > 0 ? Math.round((stage.count / analytics.total) * 100) : 0;
                    return (
                      <div key={stage.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${stage.color.text}`}>{stage.label}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {stage.count} &nbsp;
                            <span className="text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${stage.color.bg}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Job Details */}
            {job && (
              <div className="rounded-[14px] border bg-card p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Job Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {job.department && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Department
                        </p>
                        <p className="text-foreground font-medium">{job.department}</p>
                      </div>
                    )}
                    {job.guild && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Guild
                        </p>
                        <p className="text-foreground font-medium">{job.guild}</p>
                      </div>
                    )}
                    {job.type && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Type
                        </p>
                        <p className="text-foreground font-medium">{job.type}</p>
                      </div>
                    )}
                    {job.salary && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Salary
                        </p>
                        <p className="text-foreground font-medium">
                          {formatSalaryRange(job.salary)}
                        </p>
                      </div>
                    )}
                    {job.location && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Location
                        </p>
                        <p className="text-foreground font-medium">{job.location}</p>
                      </div>
                    )}
                  </div>
                  {job.description && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-foreground text-sm leading-relaxed line-clamp-6">
                        {job.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
