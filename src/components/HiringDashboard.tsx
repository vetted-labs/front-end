"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  TrendingUp,
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  Building2,
} from "lucide-react";
import { Button, LoadingState, Alert, Card, StatusBadge } from "./ui";
import { StatCard } from "./dashboard/StatCard";
import { jobsApi, dashboardApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { JOB_STATUSES } from "@/config/constants";

import { useAuthContext } from "@/hooks/useAuthContext";

import type { Job, DashboardStats } from "@/types";

export function HiringDashboard() {
  const router = useRouter();
  const [jobPostings, setJobPostings] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { execute } = useApi();
  const auth = useAuthContext();

  // Check authentication on mount
  useEffect(() => {
    if (auth.userType === "candidate") {
      router.push("/candidate/profile");
      return;
    }
    if (!auth.isAuthenticated || auth.userType !== "company") {
      router.push("/auth/login?type=company&redirect=/dashboard");
    }
  }, [auth.isAuthenticated, auth.userType, router]);

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterStatus]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const companyId = auth.userId;
      if (!auth.isAuthenticated) {
        router.push("/auth/login?type=company&redirect=/dashboard");
        return;
      }

      const [jobsResponse, statsData] = await Promise.all([
        jobsApi.getAll({
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: searchQuery || undefined,
          companyId: companyId || undefined,
        }),
        dashboardApi.getStats(companyId || undefined),
      ]);

      const jobsData = Array.isArray(jobsResponse) ? jobsResponse : [];
      if (Array.isArray(jobsData)) {
        setJobPostings(jobsData);
      }
      setStats(statsData as DashboardStats);
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 401) {
        auth.logout();
        router.push("/auth/login?type=company&redirect=/dashboard");
        return;
      }
      setError(
        `Failed to load data. Ensure backend is running. Details: ${(error as Error).message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    await execute(() => jobsApi.delete(jobId), {
      onSuccess: () => {
        setJobPostings((prev) => prev.filter((job) => job.id !== jobId));
      },
      onError: (err) => {
        if (err.includes("401")) {
          router.push("/auth/login?type=company&redirect=/dashboard");
        }
      },
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Jobs"
            value={stats?.totalJobs || 0}
            icon={Briefcase}
          />
          <StatCard
            title="Active Postings"
            value={stats?.activeJobs || 0}
            icon={TrendingUp}
            iconBgColor="bg-green-100 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Total Applicants"
            value={stats?.totalApplicants || 0}
            icon={Users}
            iconBgColor="bg-blue-100 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Avg. Days to Hire"
            value={stats?.averageTimeToHire || 0}
            icon={Clock}
            iconBgColor="bg-amber-100 dark:bg-amber-900/20"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Job Postings */}
        <Card padding="none">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Job Postings</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                >
                  <option value="all">All Status</option>
                  {JOB_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => router.push("/jobs/new")}
                  icon={<Plus className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Post New Job</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {jobPostings.length > 0 ? (
              jobPostings.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="p-6 hover:bg-muted hover:border-primary transition-all cursor-pointer border border-transparent"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-card-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {job.department || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {job.salary.min && job.salary.max
                                ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k`
                                : "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(
                                showActionMenu === job.id ? null : job.id
                              );
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                          </button>
                          {showActionMenu === job.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-10">
                              <button
                                onClick={() => router.push(`/jobs/${job.id}`)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button
                                onClick={() =>
                                  router.push(`/jobs/${job.id}/edit`)
                                }
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4">
                        <StatusBadge status={job.status ?? "draft"} />
                        <span className="text-sm text-card-foreground">
                          <strong>{job.applicants}</strong> applicants
                        </span>
                        <span className="text-sm text-card-foreground">
                          <strong>{job.views}</strong> views
                        </span>
                        <span className="text-sm text-card-foreground">
                          Guild: <strong>{job.guild}</strong>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-card-foreground mb-4">No job postings found</p>
                <Button onClick={() => router.push("/jobs/new")}>
                  Create Your First Job Posting
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
