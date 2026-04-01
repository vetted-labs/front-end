"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
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
import { Button, Alert } from "./ui";
import { Pagination } from "./ui/pagination";
import { ConfirmationModal } from "./ui/confirmation-modal";
import { GuildSelector } from "./ui/guild-selector";
import { jobsApi, dashboardApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { formatSalaryRange } from "@/lib/utils";
import { JOB_STATUSES, JOB_STATUS_CONFIG } from "@/config/constants";

import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { STATUS_COLORS } from "@/config/colors";

import { DataSection } from "@/lib/motion";
import type { Job, DashboardStats } from "@/types";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";

export function HiringDashboard() {
  const router = useRouter();
  const { auth, ready } = useRequireAuth("company");
  const [jobPostings, setJobPostings] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGuild, setFilterGuild] = useState<string>("all");
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [confirmAction, setConfirmAction] = useState<{ action: () => void; message: string } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(actionMenuRef, () => setShowActionMenu(null));
  const { execute } = useApi();

  const { isLoading, error, data, refetch } = useFetch(
    async () => {
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
      setJobPostings(jobsData);
      setStats(statsData as DashboardStats);
      return { jobs: jobsData, stats: statsData };
    },
    { skip: !ready }
  );

  // Refetch when search or filter changes
  useEffect(() => {
    if (ready) refetch();
  }, [debouncedSearch, filterStatus, ready, refetch]);

  const handleDeleteJob = (jobId: string) => {
    setConfirmAction({
      message: "Are you sure you want to delete this job posting?",
      action: async () => {
        setConfirmAction(null);
        await execute(() => jobsApi.delete(jobId), {
          onSuccess: () => {
            setJobPostings((prev) => prev.filter((job) => job.id !== jobId));
          },
          onError: (err) => {
            toast.error(err);
          },
        });
      },
    });
  };

  const guilds = useMemo(() => {
    const uniqueGuilds = [...new Set(jobPostings.map(j => j.guild).filter((g): g is string => Boolean(g)))];
    return uniqueGuilds.sort();
  }, [jobPostings]);

  const filteredJobs = useMemo(() => {
    const base = filterGuild === "all" ? jobPostings : jobPostings.filter(j => j.guild === filterGuild);
    const sorted = [...base];
    if (sortBy === "newest") sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === "applicants") sorted.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
    if (sortBy === "views") sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    return sorted;
  }, [jobPostings, filterGuild, sortBy]);

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

  return (
    <div className="min-h-full relative">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error">
              {error}
            </Alert>
          </div>
        )}

        <DataSection isLoading={isLoading && !data} skeleton={null}>
        {/* Compact Stat Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Jobs</span>
            <span className="text-sm font-medium text-foreground">{stats?.totalJobs || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
            <TrendingUp className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />
            <span className="text-xs text-muted-foreground">Active</span>
            <span className="text-sm font-medium text-foreground">{stats?.activeJobs || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
            <Users className={`w-4 h-4 ${STATUS_COLORS.info.icon}`} />
            <span className="text-xs text-muted-foreground">Applicants</span>
            <span className="text-sm font-medium text-foreground">{stats?.totalApplicants || 0}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
            <Clock className={`w-4 h-4 ${STATUS_COLORS.warning.icon}`} />
            <span className="text-xs text-muted-foreground">Avg. Days</span>
            <span className="text-sm font-medium text-foreground">{stats?.averageTimeToHire || 0}</span>
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="mb-6">
          <UpcomingMeetings userType="company" />
        </div>

        {/* Job Postings */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Job Postings</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
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
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="applicants">Most Applicants</option>
                  <option value="views">Most Views</option>
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

          <div ref={actionMenuRef} className="divide-y divide-border/30">
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
                          <h3 className="text-base font-medium text-foreground mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-card-foreground">
                            <span className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              {job.department || "N/A"}
                            </span>
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              {job.salary.min || job.salary.max
                                ? formatSalaryRange(job.salary)
                                : "N/A"}
                            </span>
                            <span className="flex items-center gap-2">
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
                            <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-10">
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
                        <span className={`inline-flex items-center rounded-full font-medium px-2.5 py-1 text-sm ${(JOB_STATUS_CONFIG[job.status ?? "draft"] ?? JOB_STATUS_CONFIG.draft).className}`}>
                          {(JOB_STATUS_CONFIG[job.status ?? "draft"] ?? JOB_STATUS_CONFIG.draft).label}
                        </span>
                        <span className="text-sm text-card-foreground">
                          <strong>{job.applicants}</strong> applicants
                        </span>
                        <span className="text-sm text-card-foreground">
                          <strong>{job.views}</strong> views
                        </span>
                        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
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
        </DataSection>
      </div>

      <ConfirmationModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.action()}
        title="Delete Job Posting"
        message={confirmAction?.message ?? ""}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
