"use client";
import { useState, useEffect, useMemo, useRef } from "react";
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
  Shield,
} from "lucide-react";
import { Button, Alert, StatusBadge } from "./ui";
import { Pagination } from "./ui/pagination";
import { GuildSelector } from "./ui/guild-selector";
import { jobsApi, dashboardApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { formatSalaryRange } from "@/lib/utils";
import { JOB_STATUSES } from "@/config/constants";

import { useRequireAuth } from "@/lib/hooks/useRequireAuth";

import type { Job, DashboardStats } from "@/types";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";

export function HiringDashboard() {
  const router = useRouter();
  const { auth, ready } = useRequireAuth("company");
  const [jobPostings, setJobPostings] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGuild, setFilterGuild] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedOnce = useRef(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { execute } = useApi();

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!ready) return;
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, debouncedSearch, filterStatus]);

  const fetchDashboardData = async () => {
    // Only show full-page loading on initial fetch
    if (!hasFetchedOnce.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const companyId = auth.userId;

      const [jobsResponse, statsData] = await Promise.all([
        jobsApi.getAll({
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: debouncedSearch || undefined,
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
      hasFetchedOnce.current = true;
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

  const guilds = useMemo(() => {
    const uniqueGuilds = [...new Set(jobPostings.map(j => j.guild).filter((g): g is string => Boolean(g)))];
    return uniqueGuilds.sort();
  }, [jobPostings]);

  const filteredJobs = useMemo(() => {
    if (filterGuild === "all") return jobPostings;
    return jobPostings.filter(j => j.guild === filterGuild);
  }, [jobPostings, filterGuild]);

  const {
    paginatedItems: paginatedJobs,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredJobs, 10);

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [filterGuild, debouncedSearch, filterStatus, resetPage]);

  if (!ready) return null;

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-full relative animate-page-enter">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 content-gradient" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}

        {/* Compact Stat Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Jobs</span>
            <span className="text-sm font-semibold text-foreground">{stats?.totalJobs || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-muted-foreground">Active</span>
            <span className="text-sm font-semibold text-foreground">{stats?.activeJobs || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-muted-foreground">Applicants</span>
            <span className="text-sm font-semibold text-foreground">{stats?.totalApplicants || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card/40 backdrop-blur-md border border-border/60 px-4 py-3 dark:bg-card/30 dark:border-white/[0.06]">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-muted-foreground">Avg. Days</span>
            <span className="text-sm font-semibold text-foreground">{stats?.averageTimeToHire || 0}</span>
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="mb-6">
          <UpcomingMeetings userType="company" />
        </div>

        {/* Job Postings */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
          <div className="px-5 py-4 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Job Postings</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/60 focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/60 focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                >
                  <option value="all">All Status</option>
                  {JOB_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <GuildSelector
                  guilds={guilds.map((g) => ({ id: g, name: g }))}
                  value={filterGuild}
                  onChange={setFilterGuild}
                  size="sm"
                />
                <Button
                  onClick={() => router.push("/jobs/new")}
                  icon={<Plus className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Post New Job</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/30">
            {filteredJobs.length > 0 ? (
              paginatedJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                  className="p-5 hover:bg-muted/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-base font-semibold text-foreground mb-1">
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
                              {job.salary.min || job.salary.max
                                ? formatSalaryRange(job.salary)
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
                            className="p-1 hover:bg-muted rounded-lg"
                          >
                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                          </button>
                          {showActionMenu === job.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-card/70 backdrop-blur-sm rounded-xl shadow-lg border border-border/60 py-1 z-10 dark:bg-card/40 dark:backdrop-blur-xl dark:border-white/[0.06]">
                              <button
                                onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button
                                onClick={() =>
                                  router.push(`/dashboard/jobs/${job.id}/edit`)
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          {job.guild}
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
                <p className="text-card-foreground mb-4">
                  {filterGuild !== "all" || filterStatus !== "all" || searchQuery
                    ? "No job postings match your filters"
                    : "No job postings found"}
                </p>
                <Button onClick={() => router.push("/jobs/new")}>
                  Create Your First Job Posting
                </Button>
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
