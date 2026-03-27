"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Clock,
  ThumbsUp,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Job, GuildJobApplication } from "@/types";
import { formatTimeAgo, formatSalaryRange } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";

interface GuildJobsTabProps {
  jobs: Job[];
  guildId?: string;
  guildName: string;
  jobsCount?: number;
  applications?: GuildJobApplication[];
  onEndorseCandidate?: (applicationId: string, endorse: boolean) => void;
}

// Helper function to get job type badge color
const getJobTypeBadge = (type: string) => {
  const normalizedType = type.toLowerCase();
  switch (normalizedType) {
    case "full-time":
      return STATUS_COLORS.positive.badge;
    case "part-time":
      return STATUS_COLORS.info.badge;
    case "contract":
      return STATUS_COLORS.info.badge;
    case "freelance":
      return STATUS_COLORS.warning.badge;
    default:
      return "bg-muted text-muted-foreground";
  }
};

// Helper function to format job type display
const formatJobType = (type: string) => {
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
};

// Get match score color based on value
const getMatchScoreColor = (score: number) => {
  if (score >= 80) return "bg-positive";
  if (score >= 60) return "bg-warning";
  return "bg-negative";
};

export function GuildJobsTab({
  jobs,
  guildId,
  guildName,
  jobsCount = 0,
  applications = [],
  onEndorseCandidate,
}: GuildJobsTabProps) {
  const [activeSection, setActiveSection] = useState<"positions" | "applications">("positions");
  const router = useRouter();

  // Sort jobs by most recent first
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const displayJobsCount = sortedJobs.length > 0 ? sortedJobs.length : jobsCount;

  const handleEndorseClick = (applicationId: string) => {
    const params = new URLSearchParams({ applicationId });
    if (guildId) params.set("guildId", guildId);
    router.push(`/expert/endorsements?${params.toString()}`);
  };

  return (
    <div>
      {/* Section Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
        <button
          onClick={() => setActiveSection("positions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "positions"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="w-5 h-5" />
          Open Positions ({displayJobsCount})
        </button>
        <button
          onClick={() => setActiveSection("applications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "applications"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-5 h-5" />
          Job Applications ({applications.length})
          {applications.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/40 text-xs font-medium rounded-full">
              {applications.length}
            </span>
          )}
        </button>
      </div>

      {/* Open Positions Section */}
      {activeSection === "positions" && (
        <div>
          {sortedJobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 border border-border flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {displayJobsCount > 0
                  ? `${displayJobsCount} open positions are syncing.`
                  : `No open positions in ${guildName}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl p-5 border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer group"
                >
                  {/* Job Title */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>

                  {/* Job Type Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${getJobTypeBadge(
                        job.type
                      )}`}
                    >
                      {formatJobType(job.type)}
                    </span>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-2 mb-4">
                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
                      <span>{job.location}</span>
                    </div>

                    {/* Salary Range */}
                    {(job.salary.min || job.salary.max) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 flex-shrink-0 text-primary" />
                        <span>
                          {formatSalaryRange(job.salary)}
                        </span>
                      </div>
                    )}

                    {/* Applicant Count */}
                    {(job.applicants ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 flex-shrink-0 text-primary" />
                        <span>
                          {job.applicants} {job.applicants === 1 ? "applicant" : "applicants"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Posted Date */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span>Posted {formatTimeAgo(job.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Applications Section */}
      {activeSection === "applications" && (
        <div>
          {applications.length === 0 ? (
            <div className="relative rounded-2xl border border-border bg-card p-12 text-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)]" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-muted/50 rounded-full border border-border flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No Applications Yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  There are no job applications to review at the moment. Check back
                  later when candidates apply for positions in your guild.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  {/* Glassmorphism background layers */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_55%)] opacity-60" />
                  <div className="pointer-events-none absolute -top-20 right-[-5%] h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border opacity-60" />

                  <div className="relative z-10 p-6">
                    {/* Header: Job title + Match score */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-xl font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                          {application.jobTitle}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {application.candidateName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-foreground font-medium">
                            {application.candidateName}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {application.candidateEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(application.appliedAt).toLocaleDateString()}
                          </span>
                          {!application.reviewedByRecruiter && (
                            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/25 text-xs font-medium">
                              Awaiting Recruiter Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Match Score Circle */}
                      <div className="flex-shrink-0">
                        <div className={`relative w-[72px] h-[72px] rounded-2xl ${getMatchScoreColor(application.matchScore ?? 0)} p-[2px] shadow-sm`}>
                          <div className="w-full h-full rounded-[14px] bg-card flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white leading-none">
                              {application.matchScore}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium mt-0.5">
                              MATCH
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Application summary */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-2">
                      {application.applicationSummary}
                    </p>

                    {/* Footer: endorsements + actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                          <Award className="w-3.5 h-3.5 text-warning" />
                          <span className="text-foreground font-medium">
                            {application.endorsementCount}
                          </span>
                          <span className="text-muted-foreground">
                            endorsement{application.endorsementCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEndorseClick(application.id)}
                        className="group/btn relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/[0.08] border border-primary/30 text-primary font-medium text-sm transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4" />
                        Endorse
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
