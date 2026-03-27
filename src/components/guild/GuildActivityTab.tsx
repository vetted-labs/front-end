"use client";

import { useState } from "react";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildActivity } from "@/types";
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

/* ── Activity metadata (icon + colors per type) ── */

export const ACTIVITY_META: Record<
  string,
  { label: string; icon: typeof Activity; colorClass: string; badgeClass: string }
> = {
  expert_joined:         { label: "Expert Joined",       icon: ShieldCheck,   colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  candidate_joined:      { label: "Candidate Joined",    icon: UserPlus,      colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  application_submitted: { label: "Application",         icon: Send,          colorClass: STATUS_COLORS.info.text,     badgeClass: STATUS_COLORS.info.badge },
  job_posted:            { label: "Job Posted",           icon: Briefcase,     colorClass: "text-primary",              badgeClass: "bg-primary/10 text-primary border border-primary/20" },
  candidate_approved:    { label: "Candidate Approved",   icon: CheckCircle,   colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  member_approved:       { label: "Member Approved",      icon: CheckCircle,   colorClass: STATUS_COLORS.positive.text, badgeClass: STATUS_COLORS.positive.badge },
  member_rejected:       { label: "Member Rejected",      icon: XCircle,       colorClass: STATUS_COLORS.negative.text, badgeClass: STATUS_COLORS.negative.badge },
  proposal_submitted:    { label: "Proposal",             icon: FileText,      colorClass: STATUS_COLORS.neutral.text,  badgeClass: STATUS_COLORS.neutral.badge },
  endorsement_given:     { label: "Endorsement",          icon: Award,         colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  expert_applied:        { label: "Expert Applied",       icon: ShieldCheck,   colorClass: STATUS_COLORS.warning.text,  badgeClass: STATUS_COLORS.warning.badge },
  candidate_applied:     { label: "Candidate Applied",    icon: UserPlus,      colorClass: STATUS_COLORS.info.text,     badgeClass: STATUS_COLORS.info.badge },
  application_reviewed:  { label: "Application Reviewed", icon: ClipboardCheck, colorClass: STATUS_COLORS.neutral.text, badgeClass: STATUS_COLORS.neutral.badge },
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
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
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
                    <span className={`text-xs font-medium uppercase tracking-wider ${meta.colorClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground/50 ml-auto">
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
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
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
                                    <span className="font-medium">{activity.actor}</span>{" "}
                                    <span className="text-muted-foreground">{activity.details}</span>
                                    {activity.target && (
                                      <span className="font-medium"> {activity.target}</span>
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
