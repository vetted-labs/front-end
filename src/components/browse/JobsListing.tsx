"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  X,
} from "lucide-react";
import { jobsApi, applicationsApi } from "@/lib/api";
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
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

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

    return filtered;
  }, [
    debouncedSearch,
    debouncedLocation,
    selectedGuilds,
    selectedJobTypes,
    selectedLocationTypes,
    jobs,
  ]);

  const {
    paginatedItems: currentJobs,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredJobs, 5);

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

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-Column Search Bar */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Role, company, or keywords"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-border/60 rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary/40 bg-card/70 backdrop-blur-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Where?"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-border/60 rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary/40 bg-card/70 backdrop-blur-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Guild Filter Chips */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {visibleGuilds.map((guild) => (
              <button
                key={guild}
                onClick={() => toggleGuild(guild)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedGuilds.includes(guild)
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card/70 backdrop-blur-sm text-card-foreground border border-border/60 hover:border-foreground/30"
                }`}
              >
                {guild}
              </button>
            ))}
            <button
              onClick={() => setShowAllGuildsModal(true)}
              className="px-4 py-2 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilterSelections}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-destructive transition-all flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Jobs List */}
        <div>
          {isLoading ? null : filteredJobs.length > 0 ? (
            <>
              <div className="space-y-3">
                {currentJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    hasApplied={appliedJobIds.has(job.id)}
                    showAppliedBadge={isCandidate}
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
            <div className="text-center py-16 glass-card rounded-2xl border border-border/60">
              <Briefcase className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
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
                    : "bg-card/70 text-card-foreground border border-border/60 hover:border-foreground/30"
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
