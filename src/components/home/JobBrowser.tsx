"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Briefcase, Building2, MapPin } from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getTimeAgo } from "@/lib/utils";
import type { Job } from "@/types";

interface JobBrowserProps {
  jobs: Job[];
  isLoadingJobs: boolean;
}

export function JobBrowser({ jobs, isLoadingJobs }: JobBrowserProps) {
  const router = useRouter();

  // Filter state
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>([]);

  // Extract unique guilds from jobs
  const allGuilds = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.guild?.replace(/ Guild$/i, ""))
          .filter((guild): guild is string => !!guild)
      )
    );
  }, [jobs]);

  const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance"];
  const locationTypes = ["Remote", "Onsite", "Hybrid"];

  const toggleGuild = (guild: string) => {
    setSelectedGuilds((prev) =>
      prev.includes(guild) ? prev.filter((g) => g !== guild) : [...prev, guild]
    );
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleLocationType = (type: string) => {
    setSelectedLocationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
  };

  // Filter jobs based on selected filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedGuilds.length > 0) {
        const jobGuild = job.guild?.replace(/ Guild$/i, "");
        const matchesGuild = selectedGuilds.some((selectedGuild) => {
          const cleanSelected = selectedGuild.replace(/ Guild$/i, "");
          return jobGuild?.toLowerCase() === cleanSelected.toLowerCase();
        });
        if (!matchesGuild) return false;
      }

      if (
        selectedJobTypes.length > 0 &&
        !selectedJobTypes.includes(job.type)
      ) {
        return false;
      }

      if (selectedLocationTypes.length > 0) {
        if (!job.locationType) return false;
        const jobLocationType =
          job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1);
        if (!selectedLocationTypes.includes(jobLocationType)) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedGuilds, selectedJobTypes, selectedLocationTypes]);

  const displayedJobs = filteredJobs.slice(0, 6);
  const hasActiveFilters =
    selectedGuilds.length > 0 ||
    selectedJobTypes.length > 0 ||
    selectedLocationTypes.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-foreground mb-6 font-serif">
        Latest Opportunities
      </h2>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl p-6 border border-border sticky top-20">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Filters
            </h3>

            {/* Guilds */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Guilds
              </h4>
              <div className="space-y-2">
                {allGuilds.slice(0, 5).map((guild) => (
                  <label
                    key={guild}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGuilds.includes(guild)}
                      onChange={() => toggleGuild(guild)}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {guild}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Job Type
              </h4>
              <div className="space-y-2">
                {jobTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedJobTypes.includes(type)}
                      onChange={() => toggleJobType(type)}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Type */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Location
              </h4>
              <div className="space-y-2">
                {locationTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocationTypes.includes(type)}
                      onChange={() => toggleLocationType(type)}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 w-full px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="lg:col-span-3">
          {isLoadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : displayedJobs.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {displayedJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/browse/jobs/${job.id}`)}
                    className="bg-card rounded-lg p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    {/* Company Logo & Time */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {job.companyLogo ? (
                          <img
                            src={getAssetUrl(job.companyLogo)}
                            alt={job.companyName || "Company"}
                            className="w-10 h-10 rounded-lg object-cover border border-border"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${job.companyLogo ? "hidden" : "flex"}`}
                        >
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(job.createdAt)}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h3>

                    {/* Company & Location */}
                    <div className="text-sm text-muted-foreground mb-3 space-y-1">
                      {job.companyName && (
                        <p className="font-medium text-foreground">
                          {job.companyName}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{job.location}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {job.guild && (
                        <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded text-xs font-medium">
                          {job.guild}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-muted text-card-foreground rounded text-xs font-medium">
                        {job.type}
                      </span>
                      {job.salary.min && job.salary.max && (
                        <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                          ${job.salary.min / 1000}k - ${job.salary.max / 1000}k
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* View All Jobs Button */}
              <div className="text-center">
                <button
                  onClick={() => router.push("/browse/jobs")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-card border-2 border-border hover:border-primary rounded-xl text-foreground hover:text-primary font-medium transition-all hover:shadow-lg"
                >
                  View All Jobs
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No jobs found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-primary hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
