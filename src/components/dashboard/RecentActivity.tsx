"use client";

import { VettedIcon, type VettedIconName } from "@/components/ui/vetted-icon";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertActivity } from "@/types";

interface RecentActivityProps {
  activities: ExpertActivity[];
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: VettedIconName; color: string; bgColor: string }
> = {
  proposal_vote: {
    icon: "voting",
    color: STATUS_COLORS.info.text,
    bgColor: STATUS_COLORS.info.bgSubtle,
  },
  endorsement: {
    icon: "endorsement",
    color: STATUS_COLORS.warning.text,
    bgColor: STATUS_COLORS.warning.bgSubtle,
  },
  earning: {
    icon: "earnings",
    color: STATUS_COLORS.positive.text,
    bgColor: STATUS_COLORS.positive.bgSubtle,
  },
  reputation_gain: {
    icon: "reputation",
    color: STATUS_COLORS.info.text,
    bgColor: STATUS_COLORS.info.bgSubtle,
  },
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const displayed = activities.slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full min-w-0 overflow-hidden">
      <span className="text-sm font-bold text-foreground">
        Recent Activity
      </span>

      {displayed.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          No recent activity
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {displayed.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.earning;

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border"
              >
                <div
                  className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${config.bgColor}`}
                >
                  <VettedIcon name={config.icon} className={`w-[14px] h-[14px] ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate">
                    {activity.description}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{activity.guildName}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
                {activity.amount != null && activity.amount > 0 && (
                  <span className={`shrink-0 text-xs font-medium ${STATUS_COLORS.positive.text}`}>
                    +{activity.amount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
