"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { companyApi, blockchainApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useApplicationStatusUpdate } from "@/lib/hooks/useApplicationStatusUpdate";
import { CandidateStatsBar } from "./candidates/CandidateStatsBar";
import { CandidateListPanel } from "./candidates/CandidateListPanel";
import { CandidateDetailPanel } from "./candidates/CandidateDetailPanel";
import type { CompanyApplication, EndorsementStats, ApplicationStatus, CandidateSortOption, GroupedJob } from "@/types";

export default function CandidatesPage() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");
  const [allApplications, setAllApplications] = useState<CompanyApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGuild, setFilterGuild] = useState<string>("all");
  const [sortBy, setSortBy] = useState<CandidateSortOption>("endorsements");
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [endorsementData, setEndorsementData] = useState<Map<string, EndorsementStats>>(new Map());

  // Load candidates first, then fetch endorsements in background
  const { isLoading } = useFetch(
    () => companyApi.getApplications({ limit: 500 }).then((d) => d.applications ?? []),
    {
      skip: !ready,
      onSuccess: (apps) => setAllApplications(apps),
      onError: () => toast.error("Failed to load candidates"),
    }
  );

  // Fetch endorsement stats in background after candidates load
  const endorsementsFetched = useRef(false);
  // eslint-disable-next-line no-restricted-syntax -- background fetch after initial data load
  useEffect(() => {
    if (allApplications.length === 0 || endorsementsFetched.current) return;
    endorsementsFetched.current = true;

    const uniquePairs = new Map<string, { jobId: string; candidateId: string }>();
    for (const app of allApplications) {
      const key = `${app.jobId}:${app.candidateId}`;
      if (!uniquePairs.has(key)) {
        uniquePairs.set(key, { jobId: app.jobId, candidateId: app.candidateId });
      }
    }

    (async () => {
      const endorsements = new Map<string, EndorsementStats>();
      const pairEntries = Array.from(uniquePairs.entries());
      for (let i = 0; i < pairEntries.length; i += 10) {
        const batch = pairEntries.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(([key, { jobId, candidateId }]) =>
            blockchainApi.getEndorsementStats(jobId, candidateId).then((stats) => ({ key, stats }))
          )
        );
        for (const result of results) {
          if (result.status === "fulfilled" && result.value.stats.totalEndorsements > 0) {
            endorsements.set(result.value.key, result.value.stats);
          }
        }
      }
      setEndorsementData(endorsements);
    })();
  }, [allApplications]);

  const getEndorsementCount = useCallback(
    (app: CompanyApplication): number => {
      return endorsementData.get(`${app.jobId}:${app.candidateId}`)?.totalEndorsements ?? 0;
    },
    [endorsementData]
  );

  const { updateStatus, isLoading: isUpdatingStatus } = useApplicationStatusUpdate();

  // Unique guilds for the guild filter dropdown
  const uniqueGuilds = useMemo(() => {
    const set = new Set<string>();
    for (const app of allApplications) {
      if (app.job.guild) set.add(app.job.guild);
    }
    return Array.from(set).sort();
  }, [allApplications]);

  // Group applications by job with current sort
  const groupedJobs = useMemo(() => {
    const groups = allApplications.reduce<GroupedJob[]>((acc, app) => {
      const existing = acc.find((g) => g.job.id === app.jobId);
      if (existing) {
        existing.applications.push(app);
      } else {
        acc.push({ job: app.job, applications: [app] });
      }
      return acc;
    }, []);

    for (const group of groups) {
      group.applications.sort((a, b) => {
        switch (sortBy) {
          case "endorsements": {
            const aCount = endorsementData.get(`${a.jobId}:${a.candidateId}`)?.totalEndorsements ?? 0;
            const bCount = endorsementData.get(`${b.jobId}:${b.candidateId}`)?.totalEndorsements ?? 0;
            return bCount - aCount;
          }
          case "newest":
            return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
          case "oldest":
            return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
          case "name":
            return a.candidate.fullName.localeCompare(b.candidate.fullName);
        }
      });
    }

    return groups;
  }, [allApplications, endorsementData, sortBy]);

  // Apply search, status, and job filters
  const filteredJobs = useMemo(() => {
    return groupedJobs
      .map((group) => {
        const filteredApps = group.applications.filter((app) => {
          const matchesSearch =
            !debouncedSearch ||
            app.candidate.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            app.candidate.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            group.job.title.toLowerCase().includes(debouncedSearch.toLowerCase());

          const matchesFilter = filterStatus === "all" || app.status === filterStatus;
          const matchesGuild = filterGuild === "all" || group.job.guild === filterGuild;

          return matchesSearch && matchesFilter && matchesGuild;
        });

        return filteredApps.length > 0 ? { ...group, applications: filteredApps } : null;
      })
      .filter(Boolean) as GroupedJob[];
  }, [groupedJobs, debouncedSearch, filterStatus, filterGuild]);

  // Auto-expand all groups whenever the filtered list changes
  // eslint-disable-next-line no-restricted-syntax -- sync expanded state with filter changes
  useEffect(() => {
    setExpandedJobIds(new Set(filteredJobs.map((g) => g.job.id)));
  }, [filteredJobs]);

  // Auto-expand when selecting a candidate in a collapsed group
  // eslint-disable-next-line no-restricted-syntax -- sync expanded state with selection
  useEffect(() => {
    if (selectedApplication) {
      setExpandedJobIds((prev) => {
        if (prev.has(selectedApplication.jobId)) return prev;
        return new Set([...prev, selectedApplication.jobId]);
      });
    }
  }, [selectedApplication]);

  const handleToggleJob = useCallback((jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedJobIds(new Set(filteredJobs.map((g) => g.job.id)));
  }, [filteredJobs]);

  const handleCollapseAll = useCallback(() => {
    setExpandedJobIds(new Set());
  }, []);

  const stats = useMemo(
    () => ({
      total: allApplications.length,
      pending: allApplications.filter((a) => a.status === "pending").length,
      accepted: allApplications.filter((a) => a.status === "accepted").length,
      reviewing: allApplications.filter((a) => a.status === "reviewing").length,
      interviewed: allApplications.filter((a) => a.status === "interviewed").length,
    }),
    [allApplications]
  );

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus, note?: string) => {
    const app = allApplications.find((a) => a.id === applicationId);
    if (!app) {
      toast.error("Application not found — try refreshing the page");
      return;
    }

    await updateStatus(
      {
        applicationId,
        candidateId: app.candidateId,
        jobId: app.jobId,
        currentStatus: app.status,
        newStatus,
        note,
      },
      {
        onSuccess: () => {
          setAllApplications((prev) =>
            prev.map((a) =>
              a.id === applicationId ? { ...a, status: newStatus } : a
            )
          );
          setSelectedApplication((prev) =>
            prev?.id === applicationId ? { ...prev, status: newStatus } : prev
          );
          toast.success(`Status updated to ${newStatus}`);
        },
        onError: (msg) => toast.error(`Failed to update status: ${msg}`),
      }
    );
  };

  if (!ready) return null;

  return (
    <div className="h-full flex flex-col animate-page-enter">
      {/* Mobile header */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border/30 dark:border-border lg:hidden">
        {selectedApplication ? (
          <button
            onClick={() => setSelectedApplication(null)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to list
          </button>
        ) : (
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors mb-1.5 flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Dashboard
            </button>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Candidates</h1>
          </div>
        )}
      </div>

      {/* Desktop header */}
      <div className="flex-shrink-0 hidden lg:flex items-center gap-4 px-5 py-2 border-b border-border/30 dark:border-border">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Dashboard
        </button>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Candidates</h1>
        <div className="ml-auto pr-8">
          <CandidateStatsBar
            total={stats.total}
            pending={stats.pending}
            accepted={stats.accepted}
            reviewing={stats.reviewing}
            interviewed={stats.interviewed}
            activeFilter={filterStatus}
            onFilterClick={setFilterStatus}
          />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div
          className={`w-full lg:w-[36%] xl:w-[32%] flex flex-col border-r border-border/30 dark:border-border ${
            selectedApplication ? "hidden lg:flex" : "flex"
          }`}
        >
          <CandidateListPanel
            groupedJobs={filteredJobs}
            selectedApplicationId={selectedApplication?.id ?? null}
            onSelectApplication={setSelectedApplication}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            isLoading={isLoading}
            getEndorsementCount={getEndorsementCount}
            uniqueGuilds={uniqueGuilds}
            filterGuild={filterGuild}
            onGuildFilterChange={setFilterGuild}
            sortBy={sortBy}
            onSortChange={setSortBy}
            expandedJobIds={expandedJobIds}
            onToggleJob={handleToggleJob}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />
        </div>

        {/* Right panel */}
        <div
          className={`w-full flex-1 min-w-0 min-h-0 ${
            selectedApplication ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedApplication ? (
            <CandidateDetailPanel
              key={selectedApplication.id}
              application={selectedApplication}
              onStatusChange={handleStatusChange}
              isUpdatingStatus={isUpdatingStatus}
              onBack={() => setSelectedApplication(null)}
              showBackButton
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Users}
                title="Select a candidate"
                description="Choose a candidate from the list to view their details"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
