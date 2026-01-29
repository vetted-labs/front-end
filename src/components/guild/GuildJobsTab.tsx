"use client";

import { Briefcase, MapPin, DollarSign, Users, Clock } from "lucide-react";

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

interface GuildJobsTabProps {
  jobs: Job[];
  guildName: string;
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

export function GuildJobsTab({ jobs, guildName }: GuildJobsTabProps) {
  // Sort jobs by most recent first
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Empty state
  if (sortedJobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg text-muted-foreground">
          No open positions in {guildName}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      {sortedJobs.map((job) => (
        <div
          key={job.id}
          className="bg-card border border-border rounded-lg p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
        >
          {/* Job Title */}
          <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{job.location}</span>
            </div>

            {/* Salary Range */}
            {job.salary.min && job.salary.max && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4 flex-shrink-0" />
                <span>
                  {job.salary.currency} {(job.salary.min / 1000).toFixed(0)}k -{" "}
                  {(job.salary.max / 1000).toFixed(0)}k
                </span>
              </div>
            )}

            {/* Applicant Count */}
            {job.applicants > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>
                  {job.applicants} {job.applicants === 1 ? "applicant" : "applicants"}
                </span>
              </div>
            )}
          </div>

          {/* Posted Date */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Posted {getRelativeTime(job.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
