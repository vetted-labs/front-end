"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  X,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import { getTimeAgo, formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/types";

interface JobBrowserProps {
  jobs: Job[];
  isLoadingJobs: boolean;
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-card/80 text-muted-foreground border border-border/60 hover:border-foreground/20 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function JobBrowser({ jobs, isLoadingJobs }: JobBrowserProps) {
  const router = useRouter();

  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>(
    []
  );

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

  const toggle = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const clearFilters = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
  };

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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Opportunities
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-2">
            Latest Positions
          </h2>
        </div>
        <button
          onClick={() => router.push("/browse/jobs")}
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
        >
          View all positions
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline filter pills */}
      {(allGuilds.length > 0 || jobs.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {allGuilds.slice(0, 5).map((guild) => (
            <FilterPill
              key={guild}
              label={guild}
              active={selectedGuilds.includes(guild)}
              onClick={() => toggle(guild, setSelectedGuilds)}
            />
          ))}

          <span className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />

          {jobTypes.map((type) => (
            <FilterPill
              key={type}
              label={type}
              active={selectedJobTypes.includes(type)}
              onClick={() => toggle(type, setSelectedJobTypes)}
            />
          ))}

          <span className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />

          {locationTypes.map((type) => (
            <FilterPill
              key={type}
              label={type}
              active={selectedLocationTypes.includes(type)}
              onClick={() => toggle(type, setSelectedLocationTypes)}
            />
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Jobs */}
      {isLoadingJobs ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : displayedJobs.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {displayedJobs.map((job) => {
              const salary = (job.salary.min || job.salary.max) ? formatSalaryRange(job.salary) : null;
              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/browse/jobs/${job.id}`)}
                  className="glass-card glass-border-shimmer rounded-2xl border border-border/60 p-0 cursor-pointer group hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Top section */}
                  <div className="p-6 pb-4">
                    {/* Logo row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="relative">
                        {job.companyLogo ? (
                          <img
                            src={getAssetUrl(job.companyLogo)}
                            alt={job.companyName || "Company"}
                            className="w-12 h-12 rounded-xl object-cover border border-border/60 bg-card"
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
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center ${job.companyLogo ? "hidden" : "flex"}`}
                        >
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(job.createdAt)}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h3>

                    {/* Company */}
                    {job.companyName && (
                      <p className="text-sm text-muted-foreground font-medium mb-3">
                        {job.companyName}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {job.type}
                      </span>
                    </div>

                    {/* Salary */}
                    {salary && (
                      <p className="text-sm font-semibold text-foreground">
                        {salary}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          / year
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Bottom bar */}
                  <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/40">
                    <div className="flex flex-wrap gap-1.5">
                      {job.guild && (
                        <span className="px-2 py-0.5 rounded-md bg-muted/50 text-foreground text-[11px] font-medium border border-border/60">
                          {job.guild.replace(/ Guild$/i, "")}
                        </span>
                      )}
                      {job.locationType && (
                        <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
                          {job.locationType.charAt(0).toUpperCase() +
                            job.locationType.slice(1)}
                        </span>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all duration-200" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* View all CTA */}
          <div className="text-center">
            <button
              onClick={() => router.push("/browse/jobs")}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 transition-all"
            >
              View All Positions
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16 glass-card rounded-2xl border border-border/60">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
            <Briefcase className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            No positions found
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Try adjusting your filters to see more results
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Clear all filters
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
