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
  HelpCircle,
} from "lucide-react";
import { Button, Alert } from "./ui";
import { Pagination } from "./ui/pagination";
import { ConfirmationModal } from "./ui/confirmation-modal";
import { GuildSelector } from "./ui/guild-selector";
import { GuildAvatar, GuildBadge } from "@/components/ui/guild";
import { jobsApi, dashboardApi, getAssetUrl } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { formatSalaryRange, formatTimeAgo, cn } from "@/lib/utils";
import { JOB_STATUSES, JOB_STATUS_CONFIG } from "@/config/constants";

import { useRequireAuth } from "@/lib/hooks/useRequireAuth";

import { DataSection } from "@/lib/motion";
import type { Job, DashboardStats } from "@/types";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const TONE_STYLES: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const toneClass = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <span
        className={cn(
          "w-10 h-10 rounded-lg grid place-items-center flex-shrink-0",
          toneClass.bg,
          toneClass.text
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

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
  const [confirmAction, setConfirmAction] = useState<{
    action: () => void;
    message: string;
  } | null>(null);
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

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on filter change (useFetch doesn't support custom deps)
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
    const uniqueGuilds = [
      ...new Set(
        jobPostings.map((j) => j.guild).filter((g): g is string => Boolean(g))
      ),
    ];
    return uniqueGuilds.sort();
  }, [jobPostings]);

  const filteredJobs = useMemo(() => {
    const base =
      filterGuild === "all"
        ? jobPostings
        : jobPostings.filter((j) => j.guild === filterGuild);
    const sorted = [...base];
    if (sortBy === "newest")
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    if (sortBy === "applicants")
      sorted.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
    if (sortBy === "views")
      sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    return sorted;
  }, [jobPostings, filterGuild, sortBy]);

  const {
    paginatedItems: paginatedJobs,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredJobs, 10);

  // eslint-disable-next-line no-restricted-syntax -- reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [filterGuild, debouncedSearch, filterStatus, resetPage]);

  const hasFilters =
    filterGuild !== "all" || filterStatus !== "all" || searchQuery.length > 0;

  if (!ready) return null;

  return (
    <div className="min-h-full relative">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <DataSection isLoading={isLoading && !data} skeleton={null}>
          {/* Hiring overview hero card */}
          <section className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 sm:px-8 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Hiring overview
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
                  Your job postings
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                  Manage active roles, track applicants, and post new
                  opportunities for guild experts to vet.
                </p>
              </div>
              <Button
                onClick={() => router.push("/jobs/new")}
                icon={<Plus className="w-4 h-4" />}
                className="flex-shrink-0"
              >
                Post new job
              </Button>
            </div>
            <div className="px-6 sm:px-8 pb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiTile
                icon={<Briefcase className="w-5 h-5" />}
                label="Total jobs"
                value={stats?.totalJobs ?? 0}
                tone="primary"
              />
              <KpiTile
                icon={<TrendingUp className="w-5 h-5" />}
                label="Active"
                value={stats?.activeJobs ?? 0}
                tone="positive"
              />
              <KpiTile
                icon={<Users className="w-5 h-5" />}
                label="Applicants"
                value={stats?.totalApplicants ?? 0}
                tone="info"
              />
              <KpiTile
                icon={<Clock className="w-5 h-5" />}
                label="Avg. days"
                value={stats?.averageTimeToHire ?? 0}
                tone="warning"
              />
            </div>
          </section>

          {/* Upcoming Meetings */}
          <div className="mb-6">
            <UpcomingMeetings userType="company" />
          </div>

          {/* Toolbar */}
          <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs by title, location, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm placeholder:text-muted-foreground/70 outline-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm outline-none transition-colors cursor-pointer"
                >
                  <option value="all">All statuses</option>
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
                  className="px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm outline-none transition-colors cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="applicants">Most applicants</option>
                  <option value="views">Most views</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job postings list */}
          <div ref={actionMenuRef} className="space-y-3">
            {filteredJobs.length > 0 ? (
              paginatedJobs.map((job) => (
                <JobRowCard
                  key={job.id}
                  job={job}
                  isMenuOpen={showActionMenu === job.id}
                  onMenuToggle={() =>
                    setShowActionMenu(showActionMenu === job.id ? null : job.id)
                  }
                  onView={() => router.push(`/dashboard/jobs/${job.id}`)}
                  onEdit={() => router.push(`/dashboard/jobs/${job.id}/edit`)}
                  onDelete={() => handleDeleteJob(job.id)}
                />
              ))
            ) : (
              <EmptyJobsState
                hasFilters={hasFilters}
                onCreate={() => router.push("/jobs/new")}
              />
            )}
          </div>

          {filteredJobs.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
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

interface JobRowCardProps {
  job: Job;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function JobRowCard({
  job,
  isMenuOpen,
  onMenuToggle,
  onView,
  onEdit,
  onDelete,
}: JobRowCardProps) {
  const heroUrl = job.heroImageUrl ? getAssetUrl(job.heroImageUrl) : null;
  const logoUrl = job.companyLogo ? getAssetUrl(job.companyLogo) : null;
  const thumbnailUrl = heroUrl ?? logoUrl;
  const status = job.status ?? "draft";
  const statusConfig = JOB_STATUS_CONFIG[status] ?? JOB_STATUS_CONFIG.draft;
  const questionCount = job.applicationQuestions?.length ?? 0;
  const salaryText =
    job.salary?.min || job.salary?.max
      ? formatSalaryRange(job.salary)
      : null;

  const metaParts: string[] = [];
  if (job.department) metaParts.push(job.department);
  if (job.location) metaParts.push(job.location);
  if (job.type) metaParts.push(job.type);

  return (
    <div
      onClick={onView}
      className="group relative rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.25)] transition-all cursor-pointer overflow-hidden"
    >
      <div className="flex items-start gap-4 p-5">
        {/* Thumbnail — hero image, then company logo, then guild icon fallback */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-card">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
            <img
              src={thumbnailUrl}
              alt=""
              className={cn(
                "w-full h-full transition-transform duration-500 group-hover:scale-105",
                heroUrl ? "object-cover" : "object-contain p-2 bg-white"
              )}
            />
          ) : (
            <GuildAvatar
              guild={job.guild}
              size="lg"
              rounded="xl"
              className="w-full h-full"
            />
          )}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              {metaParts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-x-1.5">
                  {metaParts.map((part, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      )}
                      <span className="truncate">{part}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* Action menu */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle();
                }}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Job actions"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={onView}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> View details
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-3 flex items-center flex-wrap gap-x-2 gap-y-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full font-semibold px-2.5 py-0.5 text-[11px]",
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </span>
            {job.guild && <GuildBadge guild={job.guild} size="xs" />}
            {salaryText && (
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {salaryText}
              </span>
            )}

            <span className="ml-auto flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span className="tabular-nums font-medium text-foreground">
                  {job.applicants ?? 0}
                </span>
                <span>applicants</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span className="tabular-nums font-medium text-foreground">
                  {job.views ?? 0}
                </span>
                <span>views</span>
              </span>
              {questionCount > 0 && (
                <span
                  className="flex items-center gap-1.5"
                  title="Custom application questions"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-medium text-foreground">
                    {questionCount}
                  </span>
                  <span>
                    question{questionCount === 1 ? "" : "s"}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeAgo(job.createdAt)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyJobsState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        <Briefcase className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? "No matching jobs" : "No job postings yet"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your search, status, or guild filter to see more results."
          : "Post your first role and let guild experts vet candidates on your behalf."}
      </p>
      <div className="mt-5">
        <Button onClick={onCreate} icon={<Plus className="w-4 h-4" />}>
          {hasFilters ? "Post a new job" : "Create your first job posting"}
        </Button>
      </div>
    </div>
  );
}
