"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { companyApi, applicationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { CandidateDetailModal } from "@/components/dashboard/CandidateDetailModal";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CompanyApplication } from "@/types";

interface GroupedCandidate {
  candidate: CompanyApplication["candidate"];
  applications: CompanyApplication[];
}

export default function CandidatesPage() {
  const router = useRouter();
  const { auth, ready } = useRequireAuth("company");
  const [groupedCandidates, setGroupedCandidates] = useState<GroupedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetchApplications();
  }, [ready]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await companyApi.getApplications({ limit: 500 });

      // Group by candidate
      const grouped = ((data.applications || data || []) as CompanyApplication[]).reduce((acc: GroupedCandidate[], app: CompanyApplication) => {
        const existing = acc.find((g) => g.candidate.id === app.candidateId);
        if (existing) {
          existing.applications.push(app);
        } else {
          acc.push({
            candidate: app.candidate,
            applications: [app],
          });
        }
        return acc;
      }, []);

      setGroupedCandidates(grouped);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const allApps = groupedCandidates.flatMap((g) => g.applications);
    return {
      total: groupedCandidates.length,
      pending: allApps.filter((a) => a.status === "pending").length,
      accepted: allApps.filter((a) => a.status === "accepted").length,
      reviewing: allApps.filter((a) => a.status === "reviewing").length,
    };
  }, [groupedCandidates]);

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

  const {
    paginatedItems: paginatedCandidates,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredCandidates, 25);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, filterStatus, resetPage]);

  const getStatusBadge = (status: string) => {
    const config = APPLICATION_STATUS_CONFIG[status] || APPLICATION_STATUS_CONFIG.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      await applicationsApi.updateStatus(applicationId, newStatus);
      setGroupedCandidates((prev) =>
        prev.map((group) => ({
          ...group,
          applications: group.applications.map((app) =>
            app.id === applicationId
              ? { ...app, status: newStatus as CompanyApplication["status"] }
              : app
          ),
        }))
      );
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication({
          ...selectedApplication,
          status: newStatus as CompanyApplication["status"],
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-full relative">
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
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Candidates</p>
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

        {/* Search + Filter — inline, no card wrapper */}
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

        {/* Candidates List */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No candidates found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Candidates will appear here once they apply to your job postings"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedCandidates.map((group) => (
              <div key={group.candidate.id}>
                {/* ── Candidate Identity ── */}
                <div className="rounded-t-xl border border-border/60 dark:border-white/[0.06] bg-card/60 dark:bg-card/30 backdrop-blur-sm px-5 py-4">
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
                </div>

                {/* ── Applications Table ── */}
                <div className="rounded-b-xl border border-t-0 border-border/60 dark:border-white/[0.06] bg-card/30 dark:bg-card/15 overflow-hidden">
                  {/* Column Headers */}
                  <div className="grid grid-cols-[1fr_140px_100px_80px_20px] gap-2 px-5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/30 dark:border-white/[0.04]">
                    <span>Position</span>
                    <span>Location</span>
                    <span>Applied</span>
                    <span>Status</span>
                    <span />
                  </div>

                  {/* Application Rows */}
                  {group.applications.map((app, idx) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        setSelectedApplication(app);
                        setShowApplicationModal(true);
                      }}
                      className={cn(
                        "w-full grid grid-cols-[1fr_140px_100px_80px_20px] gap-2 items-center px-5 py-3 text-left transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.03] cursor-pointer group",
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
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
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
