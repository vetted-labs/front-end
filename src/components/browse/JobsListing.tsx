"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { applicationsApi, jobsApi, matchingApi } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Divider } from "@/components/ui/divider";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { useFetch } from "@/lib/hooks/useFetch";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Job } from "@/types";
import { JobsFilterModal } from "./JobsFilterModal";
import { JobRow } from "./JobRow";
import { JobPreviewPanel } from "./JobPreviewPanel";
import { GuildPill } from "@/components/ui/guild";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];
const LOCATION_TYPES = ["Remote", "Onsite", "Hybrid"];

export default function JobsListing() {
  useGuilds();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>(
    [],
  );
  const auth = useAuthContext();
  const isCandidate = auth.isAuthenticated && auth.userType === "candidate";
  const candidateId = isCandidate ? (auth.userId ?? null) : null;
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState("newest");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedLocation = useDebounce(locationQuery, 300);
  const [showGuildModal, setShowGuildModal] = useState(false);
  const [showAllGuildsModal, setShowAllGuildsModal] = useState(false);
  // User's explicit row-click. The effective selection (below) falls back to
  // the first visible row whenever this id isn't in the current page.
  const [explicitJobId, setExplicitJobId] = useState<string | null>(null);

  // Fetch candidate's applications if authenticated as candidate
  useFetch(() => applicationsApi.getAll(), {
    skip: !isCandidate,
    onSuccess: (data) => {
      const applications = data?.applications || [];
      const jobIds = new Set<string>(applications.map((app) => app.jobId));
      setAppliedJobIds(jobIds);
    },
    onError: (err) => {
      toast.error("Failed to fetch applications");
      logger.error("Failed to fetch applications", err, { silent: true });
    },
  });

  // Fetch match scores for recommended jobs (candidates only)
  const { data: recommendedJobs } = useFetch(
    () => matchingApi.getRecommendedJobs(candidateId!, undefined, 50),
    { skip: !candidateId },
  );

  const matchScoreMap = useMemo(() => {
    if (!recommendedJobs) return new Map<string, number>();
    return new Map(recommendedJobs.map((r) => [r.jobId, r.matchScore]));
  }, [recommendedJobs]);
  // matchScoreMap is preserved for future row-level surfacing; row UI keeps
  // the visual rhythm clean for now and falls back to the badge-free layout.
  void matchScoreMap;

  // Fetch jobs listing
  const { data: jobs, isLoading } = useFetch<Job[]>(
    () =>
      jobsApi.getAll({ status: "active" }).then((data) => {
        const jobsList = Array.isArray(data) ? data : [];
        return jobsList.map((job) => ({
          ...job,
          title: job.title || "Untitled Position",
          description: job.description || "",
          guild: job.guild || "",
          department: job.department || null,
          requirements: job.requirements || [],
          skills: job.skills || [],
          screeningQuestions: job.screeningQuestions || [],
        }));
      }),
    {
      onError: (err) => {
        toast.error("Failed to load jobs");
        logger.error("Failed to load jobs", err, { silent: true });
      },
    },
  );

  // Get unique guilds from actual jobs data
  const allGuilds = useMemo(
    () =>
      Array.from(
        new Set(
          (jobs || [])
            .map((job) => job.guild?.replace(/ Guild$/i, ""))
            .filter((g): g is string => Boolean(g)),
        ),
      ).sort(),
    [jobs],
  );

  const visibleGuilds = allGuilds.slice(0, 6);

  const filteredJobs = useMemo(() => {
    let filtered = jobs || [];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.title && job.title.toLowerCase().includes(query)) ||
          (job.description && job.description.toLowerCase().includes(query)) ||
          (job.guild && job.guild.toLowerCase().includes(query)) ||
          (job.department && job.department.toLowerCase().includes(query)) ||
          (job.companyName && job.companyName.toLowerCase().includes(query)),
      );
    }

    if (debouncedLocation) {
      const query = debouncedLocation.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.location && job.location.toLowerCase().includes(query)) ||
          (job.locationType && job.locationType.toLowerCase().includes(query)),
      );
    }

    if (selectedGuilds.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.guild) return false;
        const jobGuild = job.guild.replace(/ Guild$/i, "");
        return selectedGuilds.some((selectedGuild) => {
          const cleanSelected = selectedGuild.replace(/ Guild$/i, "");
          return jobGuild.toLowerCase() === cleanSelected.toLowerCase();
        });
      });
    }

    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter(
        (job) => job.type && selectedJobTypes.includes(job.type),
      );
    }

    if (selectedLocationTypes.length > 0) {
      filtered = filtered.filter(
        (job) =>
          job.locationType &&
          selectedLocationTypes.some(
            (type) => type.toLowerCase() === job.locationType!.toLowerCase(),
          ),
      );
    }

    const sorted = [...filtered];
    if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortBy === "salary_desc") {
      sorted.sort(
        (a, b) =>
          (b.salary?.max || b.salary?.min || 0) -
          (a.salary?.max || a.salary?.min || 0),
      );
    }
    return sorted;
  }, [
    debouncedSearch,
    debouncedLocation,
    selectedGuilds,
    selectedJobTypes,
    selectedLocationTypes,
    sortBy,
    jobs,
  ]);

  const {
    paginatedItems: currentJobs,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredJobs, 20);

  // Reset to page 1 when filters change
  // eslint-disable-next-line no-restricted-syntax -- resetPage is a stable ref from useClientPagination, needs effect to sync with filter changes
  useEffect(() => {
    resetPage();
  }, [
    debouncedSearch,
    debouncedLocation,
    selectedGuilds,
    selectedJobTypes,
    selectedLocationTypes,
    resetPage,
  ]);

  // Effective selection: user's explicit pick if it's still in the visible
  // list, otherwise the first visible row. Derived inline — no effect.
  const selectedJobId = useMemo<string | null>(() => {
    if (currentJobs.length === 0) return null;
    if (explicitJobId && currentJobs.some((j) => j.id === explicitJobId)) {
      return explicitJobId;
    }
    return currentJobs[0].id;
  }, [currentJobs, explicitJobId]);

  // Wire "/" keyboard shortcut to focus the search input
  // eslint-disable-next-line no-restricted-syntax -- DOM event subscription for keyboard shortcut that depends on a static ref
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (document.activeElement as HTMLElement)?.tagName || "",
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleGuild = (guild: string) => {
    setSelectedGuilds((prev) =>
      prev.includes(guild) ? prev.filter((g) => g !== guild) : [...prev, guild],
    );
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleLocationType = (type: string) => {
    setSelectedLocationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const clearAllFilters = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
    setSearchQuery("");
    setLocationQuery("");
  };

  const clearFilterSelections = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
  };

  const activeFilterCount =
    selectedGuilds.length +
    selectedJobTypes.length +
    selectedLocationTypes.length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalJobCount = jobs?.length || 0;
  const previewHasApplied = selectedJobId
    ? appliedJobIds.has(selectedJobId)
    : false;

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact hero */}
        <section className="pt-10 pb-6 sm:pt-12 sm:pb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80 mb-2">
            <VettedIcon name="job" className="w-3.5 h-3.5" />
            Browse jobs
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Get <span className="text-primary">Vetted</span>
            </h1>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                {totalJobCount}
              </span>{" "}
              open roles across{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {allGuilds.length}
              </span>{" "}
              guilds
            </span>
          </div>

          {/* Search bar */}
          <div className="mt-5 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by title, skill, or company…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-lg py-2.5 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08] transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted/40 border border-border rounded text-[10px] font-medium text-muted-foreground">
                  /
                </kbd>
              </span>
            </div>
          </div>
        </section>

        {/* Toolbar (chip filters) */}
        <div className="mb-5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Guild filter group */}
            <div className="inline-flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  if (selectedGuilds.length > 0) setSelectedGuilds([]);
                }}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                  selectedGuilds.length === 0
                    ? "text-primary bg-primary/[0.08] border-primary/20"
                    : "text-muted-foreground hover:text-foreground bg-card border-border"
                }`}
              >
                All
              </button>
              {visibleGuilds.map((guild) => (
                <GuildPill
                  key={guild}
                  guild={guild}
                  selected={selectedGuilds.includes(guild)}
                  onClick={() => toggleGuild(guild)}
                  size="md"
                />
              ))}
            </div>

            <Divider orientation="vertical" className="h-6 hidden sm:block" />

            {/* Job type group */}
            <div className="inline-flex items-center gap-1 bg-card border border-border rounded-full p-1">
              {JOB_TYPES.slice(0, 3).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    selectedJobTypes.includes(type)
                      ? "text-primary bg-primary/[0.08] border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <Divider orientation="vertical" className="h-6 hidden sm:block" />

            {/* Location group */}
            <div className="inline-flex items-center gap-1 bg-card border border-border rounded-full p-1">
              {LOCATION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleLocationType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    selectedLocationTypes.includes(type)
                      ? "text-primary bg-primary/[0.08] border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* More filters */}
            <button
              onClick={() => setShowAllGuildsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border transition-all"
            >
              <Filter className="w-3 h-3" />
              More
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilterSelections}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}

            {/* Sort dropdown — far right */}
            <div className="ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="salary_desc">Salary: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results bar */}
        <div className="text-xs text-muted-foreground mb-3">
          Showing{" "}
          <span className="font-medium text-foreground tabular-nums">
            {filteredJobs.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground tabular-nums">
            {totalJobCount}
          </span>{" "}
          jobs
        </div>

        {/* Workspace: list + preview */}
        <div className="pb-12">
          {isLoading ? null : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              {/* Left list */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ul className="divide-y-0">
                  {currentJobs.map((job) => (
                    <li key={job.id}>
                      <JobRow
                        job={job}
                        isActive={selectedJobId === job.id}
                        hasApplied={appliedJobIds.has(job.id)}
                        showAppliedBadge={isCandidate}
                        onSelect={setExplicitJobId}
                        mobileHref={`/browse/jobs/${job.id}`}
                      />
                    </li>
                  ))}
                </ul>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>

              {/* Right preview — sticky on lg+ */}
              <div className="hidden lg:block lg:sticky lg:top-6">
                <JobPreviewPanel
                  // remount whenever selection changes so useFetch re-runs
                  key={selectedJobId ?? "empty"}
                  jobId={selectedJobId}
                  hasApplied={previewHasApplied}
                  showApplyState={isCandidate}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <VettedIcon
                name="job"
                className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4"
              />
              <h3 className="text-lg font-bold text-foreground mb-1.5">
                No jobs found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:opacity-80 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guild Selection Modal (Other button) */}
      <Modal
        isOpen={showGuildModal}
        onClose={() => setShowGuildModal(false)}
        title="Select Additional Guilds"
      >
        <p className="text-muted-foreground mb-4">
          Choose additional guild categories to filter jobs
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {allGuilds
            .filter((guild) => !visibleGuilds.includes(guild))
            .map((guild) => (
              <button
                key={guild}
                onClick={() => toggleGuild(guild)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedGuilds.includes(guild)
                    ? "bg-foreground text-background"
                    : "bg-card text-card-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {guild}
              </button>
            ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowGuildModal(false)}
            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Filter Modal */}
      <JobsFilterModal
        isOpen={showAllGuildsModal}
        onClose={() => setShowAllGuildsModal(false)}
        allGuilds={allGuilds}
        selectedGuilds={selectedGuilds}
        onToggleGuild={toggleGuild}
        jobTypes={JOB_TYPES}
        selectedJobTypes={selectedJobTypes}
        onToggleJobType={toggleJobType}
        locationTypes={LOCATION_TYPES}
        selectedLocationTypes={selectedLocationTypes}
        onToggleLocationType={toggleLocationType}
        onClearAll={clearFilterSelections}
      />
    </div>
  );
}
