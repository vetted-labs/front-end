"use client";

import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS } from "@/config/colors";

export default function JobAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = typeof params?.jobId === "string" ? params.jobId : "";

  const { data, isLoading, error } = useFetch(
    () => analyticsApi.getJobAnalytics(jobId),
    { skip: !jobId }
  );

  if (error) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/analytics")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Analytics
        </Button>
        <div className="mt-8">
          <EmptyState
            icon={BarChart3}
            title="Job analytics coming soon"
            description="Per-job analytics will be available in a future update."
            action={{
              label: "Back to Analytics",
              onClick: () => router.push("/dashboard/analytics"),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push("/dashboard/analytics")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Job Analytics</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card p-6 rounded-xl border border-border">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        ) : data ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Views", value: String(data.views ?? "—"), icon: Eye },
                { label: "Total Applicants", value: String(data.applicantCount ?? "—"), icon: Users },
                {
                  label: "Conversion Rate",
                  value:
                    typeof data.conversionRate === "number"
                      ? `${data.conversionRate.toFixed(1)}%`
                      : "—",
                  icon: TrendingUp,
                },
                { label: "Accepted", value: String(data.acceptedCount ?? "—"), icon: CheckCircle },
              ].map((metric) => (
                <div key={metric.label} className="bg-card p-6 rounded-xl border border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                      <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                    </div>
                    <metric.icon className="w-10 h-10 text-primary/20" />
                  </div>
                </div>
              ))}
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-6">Application Status</h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Pending Review",
                      value: data.pendingCount ?? 0,
                      bg: STATUS_COLORS.warning.bgSubtle,
                      icon: Clock,
                    },
                    {
                      label: "Under Review",
                      value: data.underReviewCount ?? 0,
                      bg: STATUS_COLORS.info.bgSubtle,
                      icon: Eye,
                    },
                    {
                      label: "Accepted",
                      value: data.acceptedCount ?? 0,
                      bg: STATUS_COLORS.positive.bgSubtle,
                      icon: CheckCircle,
                    },
                    {
                      label: "Rejected",
                      value: data.rejectedCount ?? 0,
                      bg: STATUS_COLORS.negative.bgSubtle,
                      icon: Users,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`flex items-center justify-between p-4 ${s.bg} rounded-lg`}
                    >
                      <div className="flex items-center gap-3">
                        <s.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{s.label}</span>
                      </div>
                      <span className="text-2xl font-bold text-foreground">{String(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-xl font-bold text-foreground mb-6">Job Information</h3>
                <div className="space-y-4">
                  {typeof data.description === "string" && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-foreground text-sm leading-relaxed line-clamp-4">
                        {data.description}
                      </p>
                    </div>
                  )}
                  {typeof data.department === "string" && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Department</p>
                      <p className="text-foreground font-medium">{data.department}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
