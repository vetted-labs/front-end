"use client";

import { useState } from "react";
import { formatTimeAgo } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  XCircle,
  Briefcase,
  Award,
  Activity,
  UserPlus,
  ShieldCheck,
  Send,
  ClipboardCheck,
} from "lucide-react";

/* ── Shared types ── */

export type ActivityType =
  | "proposal_submitted"
  | "candidate_approved"
  | "job_posted"
  | "endorsement_given"
  | "expert_joined"
  | "candidate_joined"
  | "application_submitted"
  | "expert_applied"
  | "candidate_applied"
  | "application_reviewed"
  | "member_approved"
  | "member_rejected";

export interface GuildActivity {
  id: string;
  type: ActivityType;
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

/* ── Activity metadata (icon + colors per type) ── */

export const ACTIVITY_META: Record<
  string,
  { label: string; icon: typeof Activity; colorClass: string; badgeClass: string }
> = {
  expert_joined:         { label: "Expert Joined",       icon: ShieldCheck,   colorClass: "text-amber-500",    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  candidate_joined:      { label: "Candidate Joined",    icon: UserPlus,      colorClass: "text-emerald-500",  badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  application_submitted: { label: "Application",         icon: Send,          colorClass: "text-blue-500",     badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  job_posted:            { label: "Job Posted",           icon: Briefcase,     colorClass: "text-primary",      badgeClass: "bg-primary/10 text-primary border-primary/20" },
  candidate_approved:    { label: "Candidate Approved",   icon: CheckCircle,   colorClass: "text-emerald-500",  badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  member_approved:       { label: "Member Approved",      icon: CheckCircle,   colorClass: "text-emerald-500",  badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  member_rejected:       { label: "Member Rejected",      icon: XCircle,       colorClass: "text-red-500",      badgeClass: "bg-red-500/10 text-red-500 border-red-500/20" },
  proposal_submitted:    { label: "Proposal",             icon: FileText,      colorClass: "text-violet-500",   badgeClass: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  endorsement_given:     { label: "Endorsement",          icon: Award,         colorClass: "text-amber-500",    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  expert_applied:        { label: "Expert Applied",       icon: ShieldCheck,   colorClass: "text-amber-500",    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  candidate_applied:     { label: "Candidate Applied",    icon: UserPlus,      colorClass: "text-blue-500",     badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  application_reviewed:  { label: "Application Reviewed", icon: ClipboardCheck, colorClass: "text-purple-500",  badgeClass: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

const FALLBACK_META = ACTIVITY_META.endorsement_given;

/* ── Helpers ── */

function groupByDate(activities: GuildActivity[]): Record<string, GuildActivity[]> {
  const grouped: Record<string, GuildActivity[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  activities.forEach((a) => {
    const d = new Date(a.timestamp);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  return grouped;
}

/* ── Component props ── */

interface GuildActivityFeedProps {
  activities: GuildActivity[];
  /** Compact mode hides filter pills and limits height — used in overview sidebars */
  compact?: boolean;
  /** Maximum items to show (default: all) */
  maxItems?: number;
  /** Max height for scrollable container (default: "600px") */
  maxHeight?: string;
  /** Called when user clicks "View all activity" in compact mode */
  onViewAll?: () => void;
}

/* ── Main component ── */

export function GuildActivityFeed({
  activities,
  compact = false,
  maxItems,
  maxHeight = "600px",
  onViewAll,
}: GuildActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const sorted = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sliced = maxItems ? sorted.slice(0, maxItems) : sorted;
  const activeTypes = [...new Set(sliced.map((a) => a.type))];
  const filtered = filter === "all" ? sliced : sliced.filter((a) => a.type === filter);
  const grouped = groupByDate(filtered);

  /* ── Empty state ── */
  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Activity className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-lg text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  /* ── Compact / sidebar mode ── */
  if (compact) {
    return (
      <div>
        <div
          className="relative pl-5 border-l-2 border-border/40 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight: maxHeight || "320px" }}
        >
          {sliced.map((activity) => {
            const meta = ACTIVITY_META[activity.type] || FALLBACK_META;
            const Icon = meta.icon;
            return (
              <div key={activity.id} className="relative">
                <div
                  className={`absolute -left-[calc(0.625rem+5px)] top-3 w-2 h-2 rounded-full ring-2 ring-background ${meta.colorClass.replace("text-", "bg-")}`}
                />
                <div className="rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={`w-3.5 h-3.5 ${meta.colorClass}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.colorClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium">{activity.actor}</span>{" "}
                    <span className="text-muted-foreground">{activity.details}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="mt-3 w-full text-center text-sm text-primary hover:underline"
          >
            View all activity →
          </button>
        )}
      </div>
    );
  }

  /* ── Full mode with filters + timeline ── */
  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
            filter === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          All ({sliced.length})
        </button>
        {activeTypes.map((type) => {
          const meta = ACTIVITY_META[type] || FALLBACK_META;
          const count = sliced.filter((a) => a.type === type).length;
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filter === type
                  ? `${meta.badgeClass} border-current`
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div
          className="overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight }}
        >
          <div className="space-y-8">
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 z-10 bg-gradient-to-r from-background via-background to-transparent pb-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {dateLabel}
                  </span>
                </div>
                <div className="relative pl-6 border-l-2 border-border/50 space-y-1">
                  {items.map((activity) => {
                    const meta = ACTIVITY_META[activity.type] || FALLBACK_META;
                    const Icon = meta.icon;
                    return (
                      <div key={activity.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[calc(0.75rem+5px)] top-3.5 w-2.5 h-2.5 rounded-full ring-2 ring-background ${meta.colorClass.replace("text-", "bg-")}`}
                        />
                        <div className="rounded-xl border border-transparent bg-card/50 px-4 py-3 hover:border-border hover:bg-card transition-all">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.badgeClass} border`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-foreground leading-snug">
                                    <span className="font-semibold">{activity.actor}</span>{" "}
                                    <span className="text-muted-foreground">{activity.details}</span>
                                    {activity.target && (
                                      <span className="font-semibold"> {activity.target}</span>
                                    )}
                                  </p>
                                  <span
                                    className={`inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${meta.badgeClass} border`}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <span className="flex-shrink-0 text-xs text-muted-foreground/60 mt-0.5">
                                  {formatTimeAgo(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Activity className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground mb-1">No activity matching this filter</p>
          <button onClick={() => setFilter("all")} className="text-sm text-primary hover:underline">
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use GuildActivityFeed instead */
export { GuildActivityFeed as GuildActivityTab };
