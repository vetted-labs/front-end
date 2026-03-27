"use client";

import { Award, Vote, Coins, TrendingUp } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { ExpertActivity } from "@/types";

interface RecentActivityProps {
  activities: ExpertActivity[];
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof Vote; color: string; bgColor: string }
> = {
  proposal_vote: {
    icon: Vote,
    color: STATUS_COLORS.info.text,
    bgColor: STATUS_COLORS.info.bgSubtle,
  },
  endorsement: {
    icon: Award,
    color: STATUS_COLORS.warning.text,
    bgColor: STATUS_COLORS.warning.bgSubtle,
  },
  earning: {
    icon: Coins,
    color: STATUS_COLORS.positive.text,
    bgColor: STATUS_COLORS.positive.bgSubtle,
  },
  reputation_gain: {
    icon: TrendingUp,
    color: STATUS_COLORS.info.text,
    bgColor: STATUS_COLORS.info.bgSubtle,
  },
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const displayed = activities.slice(0, 6);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-5 h-full">
      <span className="text-[13px] font-semibold text-zinc-200">
        Recent Activity
      </span>

      {displayed.length === 0 ? (
        <p className="text-center text-[12px] text-zinc-600 py-6">
          No recent activity
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {displayed.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.earning;
            const Icon = config.icon;

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2.5 rounded-[10px] bg-white/[0.02] border border-white/[0.04]"
              >
                <div
                  className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${config.bgColor}`}
                >
                  <Icon className={`w-[14px] h-[14px] ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-zinc-300 truncate">
                    {activity.description}
                  </div>
                  <div className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                    <span>{activity.guildName}</span>
                    <span className="opacity-30">·</span>
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
                {activity.amount != null && activity.amount > 0 && (
                  <span className={`shrink-0 text-[11px] font-semibold ${STATUS_COLORS.positive.text}`}>
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
