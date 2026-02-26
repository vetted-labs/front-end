"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  MapPin,
  DollarSign,
  Briefcase,
  Building2,
  X,
  CheckCircle2,
  Star,
} from "lucide-react";
import { jobsApi, applicationsApi, getAssetUrl } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { useFetch } from "@/lib/hooks/useFetch";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Job } from "@/types";

import { useGuilds } from "@/lib/hooks/useGuilds";

export default function JobsListing() {
  const router = useRouter();
  const { resolveGuildId } = useGuilds();
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>(
    [],
  );
  const auth = useAuthContext();
  const isCandidate = auth.isAuthenticated && auth.userType === 'candidate';
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const {
    paginatedItems: currentJobs,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(filteredJobs, 5);

  const [locationQuery, setLocationQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedLocation = useDebounce(locationQuery, 300);
  const [showGuildModal, setShowGuildModal] = useState(false);
  const [showAllGuildsModal, setShowAllGuildsModal] = useState(false);

  // Fetch candidate's applications if authenticated as candidate
  useFetch(
    () => applicationsApi.getAll(),
    {
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
    }
  );

  // Fetch jobs listing
  const { data: jobs, isLoading } = useFetch<Job[]>(
    () => jobsApi.getAll({ status: 'active' }).then((data) => {
      const jobsList = Array.isArray(data) ? data : [];
      return jobsList.map((job) => ({
        ...job,
        title: job.title || 'Untitled Position',
        description: job.description || '',
        guild: job.guild || '',
        department: job.department || null,
        requirements: job.requirements || [],
        skills: job.skills || [],
        screeningQuestions: job.screeningQuestions || [],
      }));
    }),
    {
      onSuccess: (normalizedJobs) => {
        setFilteredJobs(normalizedJobs);
      },
      onError: (err) => {
        toast.error("Failed to load jobs");
        logger.error("Failed to load jobs", err, { silent: true });
      },
    }
  );

  // Get unique guilds from actual jobs data
  const allGuilds = Array.from(
    new Set(
      (jobs || [])
        .map((job) => job.guild?.replace(/ Guild$/i, ''))
        .filter((g): g is string => Boolean(g))
    )
  ).sort();

  const visibleGuilds = allGuilds.slice(0, 6);

  const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance"];
  const locationTypes = ["Remote", "Onsite", "Hybrid"];

  useEffect(() => {
    let filtered = jobs || [];

    // Filter by search query (debounced)
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

    // Filter by location (debounced)
    if (debouncedLocation) {
      const query = debouncedLocation.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.location && job.location.toLowerCase().includes(query)) ||
          (job.locationType && job.locationType.toLowerCase().includes(query)),
      );
    }

    // Filter by guilds
    if (selectedGuilds.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.guild) return false;
        // Match guild name with or without " Guild" suffix
        const jobGuild = job.guild.replace(/ Guild$/i, '');
        return selectedGuilds.some(selectedGuild => {
          const cleanSelected = selectedGuild.replace(/ Guild$/i, '');
          return jobGuild.toLowerCase() === cleanSelected.toLowerCase();
        });
      });
    }

    // Filter by job types
    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter((job) => job.type && selectedJobTypes.includes(job.type));
    }

    // Filter by location types (case-insensitive)
    if (selectedLocationTypes.length > 0) {
      filtered = filtered.filter((job) =>
        job.locationType && selectedLocationTypes.some(
          type => type.toLowerCase() === job.locationType!.toLowerCase()
        ),
      );
    }

    setFilteredJobs(filtered);
    resetPage();
  }, [debouncedSearch, debouncedLocation, selectedGuilds, selectedJobTypes, selectedLocationTypes, jobs, resetPage]);

  const toggleFilter = (
    filterArray: string[],
    setFilter: (filters: string[]) => void,
    value: string,
  ) => {
    if (filterArray.includes(value)) {
      setFilter(filterArray.filter((item) => item !== value));
    } else {
      setFilter([...filterArray, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
    setSearchQuery("");
    setLocationQuery("");
  };

  const activeFilterCount =
    selectedGuilds.length +
    selectedJobTypes.length +
    selectedLocationTypes.length;

  const toggleGuild = (guild: string) => {
    if (selectedGuilds.includes(guild)) {
      setSelectedGuilds(selectedGuilds.filter((g) => g !== guild));
    } else {
      setSelectedGuilds([...selectedGuilds, guild]);
    }
  };

  const toggleJobType = (type: string) => {
    if (selectedJobTypes.includes(type)) {
      setSelectedJobTypes(selectedJobTypes.filter((t) => t !== type));
    } else {
      setSelectedJobTypes([...selectedJobTypes, type]);
    }
  };

  const toggleLocationType = (type: string) => {
    if (selectedLocationTypes.includes(type)) {
      setSelectedLocationTypes(selectedLocationTypes.filter((t) => t !== type));
    } else {
      setSelectedLocationTypes([...selectedLocationTypes, type]);
    }
  };

  const selectAllGuilds = () => {
    setSelectedGuilds([...allGuilds]);
  };

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
            {/* Role/Keywords Search */}
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

            {/* Location Search */}
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
            {(selectedGuilds.length > 0 || selectedJobTypes.length > 0 || selectedLocationTypes.length > 0) && (
              <button
                onClick={() => {
                  setSelectedGuilds([]);
                  setSelectedJobTypes([]);
                  setSelectedLocationTypes([]);
                }}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-destructive transition-all flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Jobs List - Full Width */}
        <div>

          {isLoading ? (
            null
          ) : filteredJobs.length > 0 ? (
            <>
              <div className="space-y-3">
                {currentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/browse/jobs/${job.id}`}
                    className="block bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-border/60 group relative"
                  >
                    {/* Posted Date - Top Right Corner */}
                    <div className="absolute top-4 right-5 text-xs text-muted-foreground">
                      {getTimeAgo(job.createdAt)}
                    </div>

                    <div className="flex gap-5">
                      {/* Company Logo - Left Side */}
                      <div className="flex-shrink-0">
                        {job.companyLogo ? (
                          <img
                            src={getAssetUrl(job.companyLogo)}
                            alt={job.companyName || "Company"}
                            className="w-16 h-16 rounded-lg object-cover border border-border"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-16 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center ${job.companyLogo ? 'hidden' : 'flex'}`}
                        >
                          <Building2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Job Content */}
                      <div className="flex-1 min-w-0">
                        {/* Job Title and Featured Badge */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded text-xs font-bold">
                                  <Star className="w-3 h-3 fill-white" />
                                  FEATURED
                                </span>
                              )}
                              {isCandidate && appliedJobIds.has(job.id) && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Applied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Company Name and Location on same line */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
                          {job.companyName && (
                            <span className="font-medium text-foreground">
                              {job.companyName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                            {job.locationType && job.locationType.toLowerCase() !== job.location.toLowerCase() && (
                              <span className="capitalize"> • {job.locationType}</span>
                            )}
                          </span>
                        </div>

                        {/* Tags: Guild, Job Type, Salary */}
                        <div className="flex flex-wrap items-center gap-2">
                          {job.guild && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const guildUuid = resolveGuildId(job.guild!);
                                if (guildUuid) router.push(`/guilds/${guildUuid}`);
                              }}
                              className="px-2.5 py-1 bg-muted/50 text-foreground border border-border/60 rounded-md text-xs font-medium hover:bg-muted transition-colors"
                            >
                              {job.guild}
                            </button>
                          )}
                          <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-md text-xs font-medium">
                            {job.type}
                          </span>
                          {(job.salary.min || job.salary.max) && (
                            <span className="px-2.5 py-1 bg-muted/50 text-foreground rounded-md text-xs font-semibold">
                              {formatSalaryRange(job.salary)}
                            </span>
                          )}
                          {job.experienceLevel && (
                            <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-md text-xs font-medium capitalize">
                              {job.experienceLevel}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 5).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-muted/30 text-muted-foreground rounded-md text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skills.length > 5 && (
                                <span className="px-2 py-0.5 text-muted-foreground text-xs">
                                  +{job.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
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
                onClick={() => {
                  toggleGuild(guild);
                }}
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
      <Modal
        isOpen={showAllGuildsModal}
        onClose={() => setShowAllGuildsModal(false)}
        title="Filter Jobs"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Guilds Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Guilds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allGuilds.map((guild) => (
                <button
                  key={guild}
                  onClick={() => toggleGuild(guild)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedGuilds.includes(guild)
                      ? "bg-foreground text-background"
                      : "bg-card/70 text-card-foreground border border-border/60 hover:border-foreground/30"
                  }`}
                >
                  {guild}
                </button>
              ))}
            </div>
          </div>

          {/* Job Types Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Job Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedJobTypes.includes(type)
                      ? "bg-foreground text-background"
                      : "bg-card/70 text-card-foreground border border-border/60 hover:border-foreground/30"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Location Types Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Work Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {locationTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleLocationType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedLocationTypes.includes(type)
                      ? "bg-foreground text-background"
                      : "bg-card/70 text-card-foreground border border-border/60 hover:border-foreground/30"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setSelectedGuilds([]);
              setSelectedJobTypes([]);
              setSelectedLocationTypes([]);
            }}
            className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowAllGuildsModal(false)}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Apply Filters
          </button>
        </div>
      </Modal>
    </div>
  );
}
