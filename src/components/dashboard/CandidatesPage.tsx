"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { companyApi, applicationsApi, blockchainApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { CandidateStatsBar } from "./candidates/CandidateStatsBar";
import { CandidateListPanel } from "./candidates/CandidateListPanel";
import { CandidateDetailPanel } from "./candidates/CandidateDetailPanel";
import type { CompanyApplication, EndorsementStats } from "@/types";

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
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [endorsementData, setEndorsementData] = useState<Map<string, EndorsementStats>>(new Map());

  const { isLoading } = useFetch(
    async () => {
      const data = await companyApi.getApplications({ limit: 500 });
      const apps = (data.applications || data || []) as CompanyApplication[];

      // Batch-fetch endorsement stats for unique job+candidate pairs
      const uniquePairs = new Map<string, { jobId: string; candidateId: string }>();
      for (const app of apps) {
        const key = `${app.jobId}:${app.candidateId}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.set(key, { jobId: app.jobId, candidateId: app.candidateId });
        }
      }

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

      return apps;
    },
    {
      skip: !ready,
      onSuccess: (apps) => setAllApplications(apps),
      onError: () => toast.error("Failed to load candidates"),
    }
  );

  const isEndorsed = useCallback(
    (app: CompanyApplication): boolean => {
      return (endorsementData.get(`${app.jobId}:${app.candidateId}`)?.totalEndorsements ?? 0) > 0;
    },
    [endorsementData]
  );

  const { execute: executeStatusUpdate } = useApi();

  // Group applications by job, with endorsed candidates sorted first
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
        const aCount = endorsementData.get(`${a.jobId}:${a.candidateId}`)?.totalEndorsements ?? 0;
        const bCount = endorsementData.get(`${b.jobId}:${b.candidateId}`)?.totalEndorsements ?? 0;
        return bCount - aCount;
      });
    }

    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApplications, endorsementData]);

  // Apply search and status filters
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

          return matchesSearch && matchesFilter;
        });

        return filteredApps.length > 0 ? { ...group, applications: filteredApps } : null;
      })
      .filter(Boolean) as GroupedJob[];
  }, [groupedJobs, debouncedSearch, filterStatus]);

  const stats = useMemo(
    () => ({
      total: allApplications.length,
      pending: allApplications.filter((a) => a.status === "pending").length,
      accepted: allApplications.filter((a) => a.status === "accepted").length,
      reviewing: allApplications.filter((a) => a.status === "reviewing").length,
    }),
    [allApplications]
  );

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
            setSelectedApplication((prev) =>
              prev ? { ...prev, status: newStatus as CompanyApplication["status"] } : null
            );
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

      <div className="relative h-[calc(100vh-4rem)]">
        {/* Mobile header — visible only on small screens */}
        <div className="px-6 py-4 border-b border-border/40 dark:border-white/[0.04] lg:hidden">
          {selectedApplication ? (
            <button
              onClick={() => setSelectedApplication(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </button>
          ) : (
            <div>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Dashboard
              </button>
              <h1 className="text-lg font-semibold text-foreground">Candidates</h1>
            </div>
          )}
        </div>

        {/* Desktop header — hidden on mobile */}
        <div className="hidden lg:block px-6 py-4 border-b border-border/40 dark:border-white/[0.04]">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Dashboard
            </button>
            <h1 className="text-lg font-semibold text-foreground">Candidates</h1>
          </div>
          <CandidateStatsBar
            total={stats.total}
            pending={stats.pending}
            accepted={stats.accepted}
            reviewing={stats.reviewing}
          />
        </div>

        {/* Two-panel layout */}
        <div className="flex h-[calc(100%-8rem)] lg:h-[calc(100%-10rem)]">
          {/* Left panel — candidate list (40%) */}
          <div
            className={`w-full lg:w-[40%] xl:w-[35%] flex flex-col ${
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
              isEndorsed={isEndorsed}
            />
          </div>

          {/* Right panel — candidate detail (60%) */}
          <div
            className={`w-full lg:w-[60%] xl:w-[65%] ${
              selectedApplication ? "flex" : "hidden lg:flex"
            }`}
          >
            {selectedApplication ? (
              <CandidateDetailPanel
                application={selectedApplication}
                onStatusChange={handleStatusChange}
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
    </div>
  );
}
