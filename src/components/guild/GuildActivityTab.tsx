"use client";

import { FileText, CheckCircle, Briefcase, Award, Activity } from "lucide-react";

interface Activity {
  id: string;
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

interface GuildActivityTabProps {
  activities: Activity[];
}

// Helper function to get activity icon
const getActivityIcon = (type: string) => {
  switch (type) {
    case "proposal_submitted":
      return <FileText className="w-4 h-4" />;
    case "candidate_approved":
      return <CheckCircle className="w-4 h-4" />;
    case "job_posted":
      return <Briefcase className="w-4 h-4" />;
    case "endorsement_given":
      return <Award className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

// Helper function to get activity color classes
const getActivityColor = (type: string) => {
  switch (type) {
    case "proposal_submitted":
      return "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400";
    case "candidate_approved":
      return "bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400";
    case "job_posted":
      return "bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70";
    case "endorsement_given":
      return "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
};

// Helper function to format relative time
const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const activityDate = new Date(timestamp);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return activityDate.toLocaleDateString();
};

export function GuildActivityTab({ activities }: GuildActivityTabProps) {
  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Empty state
  if (sortedActivities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {sortedActivities.map((activity) => (
        <div
          key={activity.id}
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            {/* Activity Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-1">
                <p className="text-foreground">
                  <span className="font-semibold">{activity.actor}</span>{" "}
                  {activity.details}
                  {activity.target && (
                    <span className="font-semibold"> {activity.target}</span>
                  )}
                </p>
                {/* Timestamp - right aligned */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {getRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
