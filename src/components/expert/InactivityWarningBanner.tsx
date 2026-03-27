"use client";

import { AlertTriangle, Activity } from "lucide-react";
import { REPUTATION_DECAY_WARNING_DAYS, REPUTATION_DECAY_CYCLE_DAYS } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertActivity } from "@/types";

interface InactivityWarningBannerProps {
  recentActivity?: ExpertActivity[];
}

/**
 * Shows a warning banner when the expert is approaching the inactivity decay window.
 * Whitepaper §2: -10 reputation points per inactive cycle (30 days).
 * Warning shows at 21+ days of inactivity.
 */
export function InactivityWarningBanner({ recentActivity }: InactivityWarningBannerProps) {
  if (!recentActivity || recentActivity.length === 0) {
    // No activity data — show warning by default
    return <Banner daysInactive={null} />;
  }

  // Find most recent activity
  const mostRecent = recentActivity.reduce((latest, item) => {
    const itemDate = new Date(item.timestamp);
    return itemDate > latest ? itemDate : latest;
  }, new Date(0));

  const now = new Date();
  const daysSinceLastActivity = Math.floor((now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastActivity < REPUTATION_DECAY_WARNING_DAYS) {
    return null;
  }

  return <Banner daysInactive={daysSinceLastActivity} />;
}

function Banner({ daysInactive }: { daysInactive: number | null }) {
  const daysUntilDecay = daysInactive !== null
    ? Math.max(0, REPUTATION_DECAY_CYCLE_DAYS - daysInactive)
    : 0;
  const isDecaying = daysUntilDecay === 0;

  return (
    <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${
      isDecaying
        ? `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle}`
        : `${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`
    }`}>
      <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${
        isDecaying ? STATUS_COLORS.negative.icon : STATUS_COLORS.warning.icon
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isDecaying ? "Reputation decay active" : "Inactivity warning"}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isDecaying
            ? "Your reputation is decaying due to inactivity (-10 points per cycle). Complete a review, vote on governance, or endorse a candidate to stop decay."
            : `Your reputation will begin decaying in ${daysUntilDecay} day${daysUntilDecay !== 1 ? "s" : ""} if you don't participate. Complete a review, vote, or endorsement to reset the timer.`
          }
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span>
            {daysInactive !== null
              ? `Last activity: ${daysInactive} day${daysInactive !== 1 ? "s" : ""} ago`
              : "No recent activity recorded"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
