"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { companyApi, getAssetUrl } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { EmptyState } from "@/components/ui/empty-state";
import { COMPANY_SIZES, INDUSTRIES } from "@/config/constants";
import { formatSalaryRange } from "@/lib/utils";
import type { CompanyProfile, Job } from "@/types";

interface Props {
  params: Promise<{ companyId: string }>;
}

export default function CompanyPublicProfilePage({ params }: Props) {
  const { companyId } = use(params);

  const fetchProfile = useCallback(
    () => companyApi.getPublicProfile(companyId),
    [companyId]
  );
  const fetchJobs = useCallback(
    () => companyApi.getPublicJobs(companyId),
    [companyId]
  );

  const { data: profile, isLoading: profileLoading, error: profileError } = useFetch<CompanyProfile>(fetchProfile);
  const { data: jobs, isLoading: jobsLoading } = useFetch<Job[]>(fetchJobs);

  if (profileLoading) {
    return null;
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <EmptyState
          icon={Building2}
          title="Company not found"
          description="This company profile may not exist or is unavailable"
        />
      </div>
    );
  }

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/browse/jobs"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Browse Jobs
        </Link>

        {/* Company Header */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-6 dark:bg-card/30 dark:border-white/[0.06] mb-6">
          <div className="flex items-start gap-5">
            {profile.logoUrl ? (
              <img
                src={getAssetUrl(profile.logoUrl)}
                alt={profile.name}
                className="w-20 h-20 rounded-xl object-cover border border-border/40 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-10 h-10 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-foreground">{profile.name}</h1>
                {profile.verified && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mt-2">
                {profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.location}
                  </span>
                )}
                {profile.industry && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {INDUSTRIES.find((i) => i.value === profile.industry)?.label || profile.industry}
                  </span>
                )}
                {profile.size && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {COMPANY_SIZES.find((s) => s.value === profile.size)?.label || profile.size}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {profile.createdAt && (
                <p className="text-xs text-muted-foreground/60 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        {profile.description && (
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-6 dark:bg-card/30 dark:border-white/[0.06] mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About</h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{profile.description}</p>
          </div>
        )}

        {/* Active Jobs */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-6 dark:bg-card/30 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Open Positions {jobs && jobs.length > 0 && <span className="text-xs text-muted-foreground/60 ml-1">({jobs.length})</span>}
          </h2>

          {jobsLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading jobs...</p>
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No open positions"
              description="This company has no active job listings right now"
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/40 dark:border-white/[0.06] hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {job.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{job.location}</span>
                      <span className="text-border dark:text-white/10">&middot;</span>
                      <span>{job.type}</span>
                      {job.salary && formatSalaryRange(job.salary) !== "Salary not specified" && (
                        <>
                          <span className="text-border dark:text-white/10">&middot;</span>
                          <span>{formatSalaryRange(job.salary)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
