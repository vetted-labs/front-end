"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Filter,
  X,
  Briefcase,
} from "lucide-react";
import { jobsApi, applicationsApi, matchingApi } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { useFetch } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Job } from "@/types";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { Divider } from "@/components/ui/divider";
import { JobCard } from "./JobCard";
import { JobsFilterModal } from "./JobsFilterModal";

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
    { skip: !candidateId }
  );

  const matchScoreMap = useMemo(() => {
    if (!recommendedJobs) return new Map<string, number>();
    return new Map(recommendedJobs.map((r) => [r.jobId, r.matchScore]));
  }, [recommendedJobs]);

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
  const allGuilds = Array.from(
    new Set(
      (jobs || [])
        .map((job) => job.guild?.replace(/ Guild$/i, ""))
        .filter((g): g is string => Boolean(g)),
    ),
  ).sort();

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
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "salary_desc") {
      sorted.sort((a, b) => (b.salary?.max || b.salary?.min || 0) - (a.salary?.max || a.salary?.min || 0));
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
  } = useClientPagination(filteredJobs, 8);

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

  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center py-16 sm:py-20 relative">
          <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/15 rounded-full px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-5">
            <Search className="w-3.5 h-3.5" />
            {totalJobCount} Open Positions
          </div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-5xl font-bold leading-[1.1] tracking-tighter mb-4">
            Find Your Next
            <br />
            <span className="text-primary animate-shimmer-text">
              Web3 Role
            </span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Discover vetted opportunities from top crypto companies. Every role
            reviewed by guild experts, every hire backed by reputation.
          </p>
        </section>

        {/* Search Bar */}
        <div className="mb-8 max-w-[720px] mx-auto">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title, skill, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-[18px] pl-[52px] pr-14 text-base text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/[0.08] focus:shadow-sm transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="px-2 py-0.5 bg-muted/30 border border-border rounded-md text-xs font-medium text-muted-foreground/50">
                /
              </span>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="mb-7">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Guild Filter Group */}
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full p-1">
              <button
                onClick={() => {
                  if (selectedGuilds.length > 0) setSelectedGuilds([]);
                }}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedGuilds.length === 0
                    ? "text-primary bg-primary/[0.08] border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                }`}
              >
                All
              </button>
              {visibleGuilds.map((guild) => (
                <button
                  key={guild}
                  onClick={() => toggleGuild(guild)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedGuilds.includes(guild)
                      ? "text-primary bg-primary/[0.08] border border-primary/20 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  {guild}
                </button>
              ))}
            </div>

            {/* Divider */}
            <Divider orientation="vertical" className="h-6" />

            {/* Job Type Group */}
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full p-1">
              {JOB_TYPES.slice(0, 3).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedJobTypes.includes(type)
                      ? "text-primary bg-primary/[0.08] border border-primary/20 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Divider */}
            <Divider orientation="vertical" className="h-6" />

            {/* Location Group */}
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full p-1">
              {LOCATION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleLocationType(type)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedLocationTypes.includes(type)
                      ? "text-primary bg-primary/[0.08] border border-primary/20 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* More Filters Button */}
            <button
              onClick={() => setShowAllGuildsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border hover:border-border transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              More
            </button>

            {/* Active Filter Count + Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilterSelections}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results Bar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredJobs.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {totalJobCount}
            </span>{" "}
            jobs
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
          >
            <option value="newest">Newest</option>
            <option value="salary_desc">Salary: High to Low</option>
          </select>
        </div>

        {/* Jobs Grid */}
        <div>
          {isLoading ? null : filteredJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    hasApplied={appliedJobIds.has(job.id)}
                    showAppliedBadge={isCandidate}
                    matchScore={matchScoreMap.get(job.id)}
                  />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Briefcase className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                No jobs found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-primary hover:text-primary font-medium"
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
