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

interface Job {
  id: string;
  title: string;
  location: string;
  type: string; // "full-time", "part-time", "contract"
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicants: number;
  createdAt: string;
}

interface JobApplication {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  appliedAt: string;
  matchScore: number;
  reviewedByRecruiter: boolean;
  endorsementCount: number;
  applicationSummary: string;
}

interface GuildJobsTabProps {
  jobs: Job[];
  guildId?: string;
  guildName: string;
  jobsCount?: number;
  applications?: JobApplication[];
  onEndorseCandidate?: (applicationId: string, endorse: boolean) => void;
}

// Helper function to format relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
};

// Helper function to get job type badge color
const getJobTypeBadge = (type: string) => {
  const normalizedType = type.toLowerCase();
  switch (normalizedType) {
    case "full-time":
      return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
    case "part-time":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    case "contract":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
    case "freelance":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
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
  if (score >= 80) return "from-emerald-400 to-emerald-500";
  if (score >= 60) return "from-amber-400 to-orange-500";
  return "from-red-400 to-red-500";
};

const getMatchScoreGlow = (score: number) => {
  if (score >= 80) return "shadow-emerald-500/30";
  if (score >= 60) return "shadow-amber-500/30";
  return "shadow-red-500/30";
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
      <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveSection("positions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "positions"
              ? "bg-orange-500/15 text-amber-200 border border-orange-400/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Briefcase className="w-5 h-5" />
          Open Positions ({displayJobsCount})
        </button>
        <button
          onClick={() => setActiveSection("applications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "applications"
              ? "bg-orange-500/15 text-amber-200 border border-orange-400/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Users className="w-5 h-5" />
          Job Applications ({applications.length})
          {applications.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-orange-500/20 text-amber-200 border border-orange-400/40 text-xs font-semibold rounded-full">
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg text-slate-300">
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
                  className="rounded-2xl p-5 border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_70px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:border-orange-400/40 cursor-pointer group"
                >
                  {/* Job Title */}
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 group-hover:text-amber-200 transition-colors">
                    {job.title}
                  </h3>

                  {/* Job Type Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${getJobTypeBadge(
                        job.type
                      )}`}
                    >
                      {formatJobType(job.type)}
                    </span>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-2 mb-4">
                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-amber-200" />
                      <span>{job.location}</span>
                    </div>

                    {/* Salary Range */}
                    {job.salary.min && job.salary.max && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <DollarSign className="w-4 h-4 flex-shrink-0 text-amber-200" />
                        <span>
                          {job.salary.currency} {(job.salary.min / 1000).toFixed(0)}k -{" "}
                          {(job.salary.max / 1000).toFixed(0)}k
                        </span>
                      </div>
                    )}

                    {/* Applicant Count */}
                    {job.applicants > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="w-4 h-4 flex-shrink-0 text-amber-200" />
                        <span>
                          {job.applicants} {job.applicants === 1 ? "applicant" : "applicants"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Posted Date */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 text-amber-200" />
                      <span>Posted {getRelativeTime(job.createdAt)}</span>
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
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 p-12 text-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)]" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  No Applications Yet
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
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
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_70px_rgba(0,0,0,0.6)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-400/40"
                >
                  {/* Glassmorphism background layers */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_55%)] opacity-60" />
                  <div className="pointer-events-none absolute -top-20 right-[-5%] h-40 w-40 rounded-full bg-orange-500/8 blur-3xl" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent opacity-60" />

                  <div className="relative z-10 p-6">
                    {/* Header: Job title + Match score */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-lg font-semibold text-slate-100 mb-1.5 group-hover:text-amber-200 transition-colors">
                          {application.jobTitle}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-amber-200">
                              {application.candidateName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-slate-300 font-medium">
                            {application.candidateName}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-sm text-slate-500 truncate">
                            {application.candidateEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(application.appliedAt).toLocaleDateString()}
                          </span>
                          {!application.reviewedByRecruiter && (
                            <span className="px-2.5 py-1 bg-orange-500/15 text-amber-200 rounded-full border border-orange-400/25 text-[11px] font-medium">
                              Awaiting Recruiter Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Match Score Circle */}
                      <div className="flex-shrink-0">
                        <div className={`relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${getMatchScoreColor(application.matchScore)} p-[2px] shadow-lg ${getMatchScoreGlow(application.matchScore)}`}>
                          <div className="w-full h-full rounded-[14px] bg-[#0b0f1b]/90 flex flex-col items-center justify-center backdrop-blur-sm">
                            <span className="text-2xl font-bold text-white leading-none">
                              {application.matchScore}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                              MATCH
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Application summary */}
                    <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">
                      {application.applicationSummary}
                    </p>

                    {/* Footer: endorsements + actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                          <Award className="w-3.5 h-3.5 text-amber-300" />
                          <span className="text-slate-300 font-medium">
                            {application.endorsementCount}
                          </span>
                          <span className="text-slate-500">
                            endorsement{application.endorsementCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEndorseClick(application.id)}
                        className="group/btn relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/30 text-amber-200 font-medium text-sm transition-all hover:border-amber-400/50 hover:from-amber-500/25 hover:via-orange-500/20 hover:to-amber-500/25 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98]"
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
