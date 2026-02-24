"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
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
import { jobsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import type { Job } from "@/types";

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

export default function AnalyticsPage() {
  const router = useRouter();
  const auth = useAuthContext();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      router.push("/auth/login?type=company");
      return;
    }
    fetchAnalytics();
  }, [router, filterStatus]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const companyId = localStorage.getItem("companyId");
      if (!companyId) return;

      // Fetch jobs for this company
      const jobsResponse: any = await jobsApi.getAll({
        status: filterStatus !== "all" ? filterStatus : undefined,
        companyId: companyId,
      });
      const jobsData = Array.isArray(jobsResponse) ? jobsResponse : [];

      if (Array.isArray(jobsData)) {
        setJobs(jobsData);

        // Calculate real analytics from jobs data
        const totalApplications = jobsData.reduce((sum, job) => sum + (job.applicants || 0), 0);
        const activeJobsCount = jobsData.filter(job => job.status === "active").length;
        const totalViews = jobsData.reduce((sum, job) => sum + (job.views || 0), 0);

        // Estimate application distribution (40% pending, 30% reviewing, 15% accepted, 15% rejected)
        const estimatedStats = {
          pending: Math.floor(totalApplications * 0.4),
          reviewing: Math.floor(totalApplications * 0.3),
          accepted: Math.floor(totalApplications * 0.15),
          rejected: Math.floor(totalApplications * 0.15),
        };

        const realAnalytics: AnalyticsData = {
          totalApplications: totalApplications,
          applicationsChange: 0, // We don't have historical data yet
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

        setAnalytics(realAnalytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const maxApplications = analytics.applicationsByMonth.length > 0
    ? Math.max(...analytics.applicationsByMonth.map(m => m.applications))
    : 1;

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-muted-foreground">Track your hiring performance and metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalApplications}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.applicationsChange >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">+{analytics.applicationsChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">{analytics.applicationsChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Hires</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalHires}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.hiresChange >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">+{analytics.hiresChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">{analytics.hiresChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-foreground">{analytics.activeJobs}</p>
              </div>
              <Briefcase className="w-10 h-10 text-blue-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">{analytics.jobsChange > 0 ? '+' : ''}{analytics.jobsChange} new this month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Time to Hire</p>
                <p className="text-3xl font-bold text-foreground">{analytics.avgTimeToHire} <span className="text-lg">days</span></p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.timeToHireChange <= 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">{analytics.timeToHireChange}%</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">+{analytics.timeToHireChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Over Time */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Applications Over Time</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>

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

          {/* Applications by Status */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Applications by Status</h3>
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-foreground">Pending</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.pending}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-foreground">Reviewing</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.reviewing}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-foreground">Accepted</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.accepted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-foreground">Rejected</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Posted Jobs */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">My Posted Jobs</h3>
              <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-medium rounded-full">
                {jobs.length} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
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
            <div className="space-y-3">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => router.push(`/dashboard/analytics/${job.id}`)}
                  className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted hover:border-primary/50 transition-all border border-transparent cursor-pointer"
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
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        job.status === "active"
                          ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : job.status === "paused"
                          ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                          : job.status === "closed"
                          ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
