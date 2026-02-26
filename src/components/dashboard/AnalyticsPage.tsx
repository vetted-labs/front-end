"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Briefcase,
  Eye,
  CheckCircle,
  Clock,
  Calendar,
  ArrowLeft,
  BarChart3,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { jobsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch } from "@/lib/hooks/useFetch";
import { Pagination } from "@/components/ui/pagination";
import type { Job } from "@/types";

const ANALYTICS_JOBS_PER_PAGE = 10;

interface AnalyticsData {
  totalApplications: number;
  applicationsChange: number;
  totalHires: number;
  hiresChange: number;
  activeJobs: number;
  jobsChange: number;
  avgTimeToHire: number;
  timeToHireChange: number;
  applicationsByMonth: Array<{
    month: string;
    applications: number;
  }>;
  applicationsByStatus: {
    pending: number;
    reviewing: number;
    accepted: number;
    rejected: number;
  };
}

const statusStyles: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  paused: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
  closed: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

function JobStatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${style}`}>
      {status}
    </span>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const auth = useAuthContext();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [jobsPage, setJobsPage] = useState(1);

  const companyId = auth.userId;

  const { data: fetchResult, isLoading, refetch } = useFetch<{ jobs: Job[]; analytics: AnalyticsData }>(
    async () => {
      if (!companyId) throw new Error("Not authenticated");

      const jobsResponse = await jobsApi.getAll({
        status: filterStatus !== "all" ? filterStatus : undefined,
        companyId: companyId,
      });
      const jobsData = Array.isArray(jobsResponse) ? jobsResponse : [];

      // Calculate real analytics from jobs data
      const totalApplications = jobsData.reduce((sum, job) => sum + (job.applicants || 0), 0);
      const activeJobsCount = jobsData.filter(job => job.status === "active").length;

      // Estimate application distribution (40% pending, 30% reviewing, 15% accepted, 15% rejected)
      const estimatedStats = {
        pending: Math.floor(totalApplications * 0.4),
        reviewing: Math.floor(totalApplications * 0.3),
        accepted: Math.floor(totalApplications * 0.15),
        rejected: Math.floor(totalApplications * 0.15),
      };

      const realAnalytics: AnalyticsData = {
        totalApplications,
        applicationsChange: 0,
        totalHires: estimatedStats.accepted,
        hiresChange: 0,
        activeJobs: activeJobsCount,
        jobsChange: 0,
        avgTimeToHire: 14, // TODO: Get from backend dashboard stats
        timeToHireChange: 0,
        applicationsByMonth: [
          // TODO: Calculate from actual application dates when available
          { month: "This month", applications: totalApplications },
        ],
        applicationsByStatus: estimatedStats,
      };

      return { jobs: jobsData, analytics: realAnalytics };
    },
    {
      skip: !companyId,
      onError: () => toast.error("Failed to load analytics"),
    }
  );

  // Refetch when filterStatus changes
  useEffect(() => {
    setJobsPage(1);
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!companyId) {
      router.push("/auth/login?type=company");
    }
  }, [companyId, router]);

  const jobs = fetchResult?.jobs ?? [];
  const analytics = fetchResult?.analytics ?? null;

  if (isLoading) {
    return null;
  }

  if (!analytics) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const jobsTotalPages = Math.ceil(jobs.length / ANALYTICS_JOBS_PER_PAGE);
  const paginatedJobs = jobs.slice(
    (jobsPage - 1) * ANALYTICS_JOBS_PER_PAGE,
    jobsPage * ANALYTICS_JOBS_PER_PAGE
  );

  const maxApplications = analytics.applicationsByMonth.length > 0
    ? Math.max(...analytics.applicationsByMonth.map(m => m.applications))
    : 1;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          </div>
          <p className="text-muted-foreground">Track your hiring performance and metrics</p>
        </div>

        {/* Key Metrics - Compact Stat Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Applications</span>
            <span className="text-sm font-semibold text-foreground">{analytics.totalApplications}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-muted-foreground">Hires</span>
            <span className="text-sm font-semibold text-foreground">{analytics.totalHires}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-muted-foreground">Active Jobs</span>
            <span className="text-sm font-semibold text-foreground">{analytics.activeJobs}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-muted-foreground">Avg. Days</span>
            <span className="text-sm font-semibold text-foreground">{analytics.avgTimeToHire}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Over Time */}
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Applications Over Time</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="p-5">
              {analytics.totalApplications === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No applications received yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.applicationsByMonth.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground font-medium">{item.month}</span>
                        <span className="text-sm text-muted-foreground">{item.applications} applications</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                          style={{ width: `${(item.applications / maxApplications) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Applications by Status */}
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Applications by Status</h3>
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-foreground">Pending</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.pending}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-foreground">Reviewing</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.reviewing}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-foreground">Accepted</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.accepted}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-foreground">Rejected</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.rejected}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Posted Jobs */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Posted Jobs</h3>
              <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-medium rounded-full">
                {jobs.length} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-card/40 backdrop-blur-sm border border-border/60 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filterStatus === "all"
                  ? "No jobs posted yet. Create your first job posting!"
                  : `No ${filterStatus} jobs found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/30">
                {paginatedJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => router.push(`/dashboard/analytics/${job.id}`)}
                    className="w-full px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.applicants ?? 0} applicants • {job.views ?? 0} views
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-muted-foreground">Conversion</p>
                        <p className="font-semibold text-foreground">
                          {(job.views ?? 0) > 0 ? (((job.applicants ?? 0) / (job.views ?? 1)) * 100).toFixed(1) : "0.0"}%
                        </p>
                      </div>
                      <div>
                        <JobStatusBadge status={job.status || "draft"} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Pagination
                currentPage={jobsPage}
                totalPages={jobsTotalPages}
                onPageChange={setJobsPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
