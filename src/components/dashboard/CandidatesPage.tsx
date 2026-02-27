"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Briefcase,
  Search,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { companyApi, applicationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { cn } from "@/lib/utils";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CompanyApplication } from "@/types";

type GroupBy = "candidates" | "jobs";

interface GroupedCandidate {
  candidate: CompanyApplication["candidate"];
  applications: CompanyApplication[];
}

interface GroupedJob {
  job: CompanyApplication["job"];
  applications: CompanyApplication[];
}

export default function CandidatesPage() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");
  const [allApplications, setAllApplications] = useState<CompanyApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("candidates");
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const { isLoading } = useFetch(
    async () => {
      const data = await companyApi.getApplications({ limit: 500 });
      return (data.applications || data || []) as CompanyApplication[];
    },
    {
      skip: !ready,
      onSuccess: (apps) => setAllApplications(apps),
      onError: () => toast.error("Failed to load candidates"),
    }
  );

  const { execute: executeStatusUpdate } = useApi();

  const groupedCandidates = useMemo(() => {
    return allApplications.reduce<GroupedCandidate[]>((acc, app) => {
      const existing = acc.find((g) => g.candidate.id === app.candidateId);
      if (existing) {
        existing.applications.push(app);
      } else {
        acc.push({ candidate: app.candidate, applications: [app] });
      }
      return acc;
    }, []);
  }, [allApplications]);

  const groupedJobs = useMemo(() => {
    return allApplications.reduce<GroupedJob[]>((acc, app) => {
      const existing = acc.find((g) => g.job.id === app.jobId);
      if (existing) {
        existing.applications.push(app);
      } else {
        acc.push({ job: app.job, applications: [app] });
      }
      return acc;
    }, []);
  }, [allApplications]);

  const stats = useMemo(() => {
    return {
      total: groupBy === "candidates" ? groupedCandidates.length : groupedJobs.length,
      pending: allApplications.filter((a) => a.status === "pending").length,
      accepted: allApplications.filter((a) => a.status === "accepted").length,
      reviewing: allApplications.filter((a) => a.status === "reviewing").length,
    };
  }, [allApplications, groupedCandidates, groupedJobs, groupBy]);

  const filteredCandidates = useMemo(() => {
    return groupedCandidates.filter((group) => {
      const matchesSearch =
        group.candidate.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        group.candidate.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        group.applications.some((app) =>
          app.job.title.toLowerCase().includes(debouncedSearch.toLowerCase())
        );

      const matchesFilter =
        filterStatus === "all" ||
        group.applications.some((app) => app.status === filterStatus);

      return matchesSearch && matchesFilter;
    });
  }, [groupedCandidates, debouncedSearch, filterStatus]);

  const filteredJobs = useMemo(() => {
    return groupedJobs.filter((group) => {
      const matchesSearch =
        group.job.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        group.job.location.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        group.applications.some((app) =>
          app.candidate.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          app.candidate.email.toLowerCase().includes(debouncedSearch.toLowerCase())
        );

      const matchesFilter =
        filterStatus === "all" ||
        group.applications.some((app) => app.status === filterStatus);

      return matchesSearch && matchesFilter;
    });
  }, [groupedJobs, debouncedSearch, filterStatus]);

  const {
    paginatedItems: paginatedCandidates,
    currentPage: candidatesPage,
    totalPages: candidatesTotalPages,
    setCurrentPage: setCandidatesPage,
    resetPage: resetCandidatesPage,
  } = useClientPagination(filteredCandidates, 25);

  const {
    paginatedItems: paginatedJobs,
    currentPage: jobsPage,
    totalPages: jobsTotalPages,
    setCurrentPage: setJobsPage,
    resetPage: resetJobsPage,
  } = useClientPagination(filteredJobs, 25);

  // Reset to page 1 when search, filter, or grouping changes
  useEffect(() => {
    resetCandidatesPage();
    resetJobsPage();
  }, [debouncedSearch, filterStatus, groupBy, resetCandidatesPage, resetJobsPage]);

  const getStatusBadge = (status: string) => {
    const config = APPLICATION_STATUS_CONFIG[status] || APPLICATION_STATUS_CONFIG.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    await executeStatusUpdate(
      () => applicationsApi.updateStatus(applicationId, newStatus),
      {
        onSuccess: () => {
          setAllApplications((prev) =>
            prev.map((app) =>
              app.id === applicationId
                ? { ...app, status: newStatus as CompanyApplication["status"] }
                : app
            )
          );
          if (selectedApplication?.id === applicationId) {
            setSelectedApplication({
              ...selectedApplication,
              status: newStatus as CompanyApplication["status"],
            });
          }
        },
        onError: () => toast.error("Failed to update application status"),
      }
    );
  };

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Candidates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all candidate applications
          </p>
        </div>

        {/* Stats Row — minimal monospaced counters */}
        <div className="grid grid-cols-4 gap-px mb-8 rounded-lg overflow-hidden border border-border/60 bg-border/60 dark:bg-white/[0.04] dark:border-white/[0.06]">
          <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{groupBy === "candidates" ? "Candidates" : "Jobs"}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Pending</p>
            <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
          <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Accepted</p>
            <p className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">{stats.accepted}</p>
          </div>
          <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Reviewing</p>
            <p className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">{stats.reviewing}</p>
          </div>
        </div>

        {/* Search + Filter + Group By */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-card/60 dark:bg-card/30 border border-border/60 dark:border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground transition-colors"
            />
          </div>
          <div className="flex items-center rounded-lg border border-border/60 dark:border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setGroupBy("candidates")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                groupBy === "candidates"
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-card/60 dark:bg-card/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Candidates
            </button>
            <button
              onClick={() => setGroupBy("jobs")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-border/60 dark:border-white/[0.06]",
                groupBy === "jobs"
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-card/60 dark:bg-card/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Jobs
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-card/60 dark:bg-card/30 border border-border/60 dark:border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="interviewed">Interviewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Loading candidates...</p>
          </div>
        ) : (groupBy === "candidates" ? filteredCandidates.length : filteredJobs.length) === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No {groupBy === "candidates" ? "candidates" : "jobs"} found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Candidates will appear here once they apply to your job postings"}
            </p>
          </div>
        ) : groupBy === "candidates" ? (
          <div className="space-y-6">
            {paginatedCandidates.map((group) => (
              <div key={group.candidate.id}>
                {/* ── Candidate Identity ── */}
                <button
                  onClick={() => {
                    setSelectedApplication(group.applications[0]);
                    setShowApplicationModal(true);
                  }}
                  className="w-full text-left rounded-t-xl border border-border/60 dark:border-white/[0.06] bg-card/60 dark:bg-card/30 backdrop-blur-sm px-5 py-4 hover:bg-muted/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-sm">
                          {group.candidate.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-medium text-foreground truncate">
                          {group.candidate.fullName}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{group.candidate.email}</span>
                          {group.candidate.experienceLevel && (
                            <>
                              <span className="text-border dark:text-white/10">|</span>
                              <span className="capitalize">{group.candidate.experienceLevel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {group.applications.length} {group.applications.length === 1 ? "application" : "applications"}
                    </span>
                  </div>
                </button>

                {/* ── Applications Table ── */}
                <div className="rounded-b-xl border border-t-0 border-border/60 dark:border-white/[0.06] bg-card/30 dark:bg-card/15 overflow-hidden">
                  <div className="grid grid-cols-[1fr_140px_100px_80px] gap-2 px-5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/30 dark:border-white/[0.04]">
                    <span>Position</span>
                    <span>Location</span>
                    <span>Applied</span>
                    <span>Status</span>
                  </div>
                  {group.applications.map((app, idx) => (
                    <div
                      key={app.id}
                      className={cn(
                        "w-full grid grid-cols-[1fr_140px_100px_80px] gap-2 items-center px-5 py-3 text-left",
                        idx < group.applications.length - 1 && "border-b border-border/20 dark:border-white/[0.03]"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{app.job.title}</p>
                        <p className="text-xs text-muted-foreground">{app.job.type}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{app.job.location}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <div>{getStatusBadge(app.status)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Pagination
              currentPage={candidatesPage}
              totalPages={candidatesTotalPages}
              onPageChange={setCandidatesPage}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedJobs.map((group) => (
              <div key={group.job.id}>
                {/* ── Job Header ── */}
                <div className="rounded-t-xl border border-border/60 dark:border-white/[0.06] bg-card/60 dark:bg-card/30 backdrop-blur-sm px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-medium text-foreground truncate">
                          {group.job.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{group.job.location}</span>
                          <span className="text-border dark:text-white/10">|</span>
                          <span>{group.job.type}</span>
                          {group.job.guild && (
                            <>
                              <span className="text-border dark:text-white/10">|</span>
                              <span>{group.job.guild}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {group.applications.length} {group.applications.length === 1 ? "applicant" : "applicants"}
                    </span>
                  </div>
                </div>

                {/* ── Candidates Table ── */}
                <div className="rounded-b-xl border border-t-0 border-border/60 dark:border-white/[0.06] bg-card/30 dark:bg-card/15 overflow-hidden">
                  <div className="grid grid-cols-[1fr_140px_100px_80px] gap-2 px-5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/30 dark:border-white/[0.04]">
                    <span>Candidate</span>
                    <span>Experience</span>
                    <span>Applied</span>
                    <span>Status</span>
                  </div>
                  {group.applications.map((app, idx) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        setSelectedApplication(app);
                        setShowApplicationModal(true);
                      }}
                      className={cn(
                        "w-full grid grid-cols-[1fr_140px_100px_80px] gap-2 items-center px-5 py-3 text-left hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors",
                        idx < group.applications.length - 1 && "border-b border-border/20 dark:border-white/[0.03]"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-medium text-xs">
                            {app.candidate.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{app.candidate.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.candidate.email}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate capitalize">
                        {app.candidate.experienceLevel || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <div>{getStatusBadge(app.status)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Pagination
              currentPage={jobsPage}
              totalPages={jobsTotalPages}
              onPageChange={setJobsPage}
            />
          </div>
        )}
      </div>

      {/* ──────── Application Detail Modal ──────── */}
      {showApplicationModal && selectedApplication && (
        <CandidateDetailModal
          application={selectedApplication}
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
