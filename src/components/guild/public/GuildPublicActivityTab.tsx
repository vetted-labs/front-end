"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  Briefcase,
  UserPlus,
  Zap,
  ClipboardCheck,
  ShieldCheck,
  Award,
  Send,
  FileText,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { GuildActivity, ActivityType, ExpertMember } from "@/types";
import { getGuildIdentity } from "@/lib/guildIdentity";

interface GuildPublicActivityTabProps {
  activities: GuildActivity[];
  guildName: string;
  experts: ExpertMember[];
}

type ChipFilter = "all" | "reviews" | "consensus" | "members" | "stake" | "posts";

interface ActivityMeta {
  /** Which chip bucket the type maps to. */
  bucket: Exclude<ChipFilter, "all">;
  Icon: typeof Activity;
  /** Tailwind classes for the 32px icon tile. */
  tileClass: string;
}

function metaFor(type: ActivityType, guildIconClass: string, guildBgClass: string, guildBorderClass: string): ActivityMeta {
  switch (type) {
    case "candidate_approved":
    case "member_approved":
      return {
        bucket: "consensus",
        Icon: CheckCircle,
        tileClass: "text-positive bg-positive/10 border-positive/25",
      };
    case "member_rejected":
      return {
        bucket: "consensus",
        Icon: XCircle,
        tileClass: "text-negative bg-negative/10 border-negative/25",
      };
    case "expert_joined":
    case "candidate_joined":
      return {
        bucket: "members",
        Icon: UserPlus,
        tileClass: "text-primary bg-primary/[0.08] border-primary/30",
      };
    case "expert_applied":
    case "candidate_applied":
    case "application_submitted":
      return {
        bucket: "members",
        Icon: Send,
        tileClass: "text-primary bg-primary/[0.08] border-primary/30",
      };
    case "endorsement_given":
      return {
        bucket: "stake",
        Icon: Zap,
        tileClass: "text-warning bg-warning/[0.08] border-warning/25",
      };
    case "proposal_submitted":
      return {
        bucket: "posts",
        Icon: FileText,
        tileClass: "text-muted-foreground bg-surface-2 border-surface-border",
      };
    case "application_reviewed":
      return {
        bucket: "reviews",
        Icon: ClipboardCheck,
        tileClass: `${guildIconClass} ${guildBgClass} ${guildBorderClass}`,
      };
    case "job_posted":
      return {
        bucket: "posts",
        Icon: Briefcase,
        tileClass: "text-primary bg-primary/[0.08] border-primary/30",
      };
    default:
      return {
        bucket: "reviews",
        Icon: ShieldCheck,
        tileClass: `${guildIconClass} ${guildBgClass} ${guildBorderClass}`,
      };
  }
}

function dayKey(timestamp: string): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  if (sameDay(d, today)) {
    return `Today · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (sameDay(d, yesterday)) {
    return `Yesterday · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

const CHIPS: { value: ChipFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reviews", label: "Reviews" },
  { value: "consensus", label: "Consensus" },
  { value: "members", label: "Members" },
  { value: "stake", label: "Stake events" },
  { value: "posts", label: "Posts & replies" },
];

export function GuildPublicActivityTab({
  activities,
  guildName,
  experts,
}: GuildPublicActivityTabProps) {
  const [filter, setFilter] = useState<ChipFilter>("all");
  const identity = getGuildIdentity(guildName);

  const sorted = useMemo(
    () =>
      [...activities].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [activities],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((a) => {
      const m = metaFor(a.type, identity.classes.text, identity.classes.bg, identity.classes.border);
      return m.bucket === filter;
    });
  }, [sorted, filter, identity]);

  const grouped = useMemo(() => {
    const acc: Record<string, GuildActivity[]> = {};
    filtered.forEach((a) => {
      const k = dayKey(a.timestamp);
      acc[k] = acc[k] || [];
      acc[k].push(a);
    });
    return acc;
  }, [filtered]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">
      <div>
        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {CHIPS.map((c) => {
            const isActive = filter === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-3 py-1.5 rounded-full border text-xs inline-flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-primary/[0.12] border-primary/35 text-primary font-semibold"
                    : "bg-surface-1 border-surface-border text-muted-foreground hover:border-surface-border-strong hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
          <div className="ml-auto text-xs text-muted-foreground">
            Streaming live
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-center">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No activity to show.</p>
          </div>
        ) : (
          <div>
            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground py-3">
                  {label}
                </div>
                {items.map((event) => {
                  const m = metaFor(
                    event.type,
                    identity.classes.text,
                    identity.classes.bg,
                    identity.classes.border,
                  );
                  const Icon = m.Icon;
                  return (
                    <div
                      key={event.id}
                      className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center px-4 py-3 mb-1.5 rounded-[10px] bg-surface-1 border border-surface-border hover:border-surface-border-strong transition-colors text-[13px]"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${m.tileClass}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-foreground min-w-0">
                        <span className="font-semibold">{event.actor}</span>{" "}
                        <span className="text-muted-foreground">{event.details}</span>
                        {event.target && (
                          <span className="font-semibold"> {event.target}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70 whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
            Last 24 hours
          </span>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <SummaryStat
              label="Reviews committed"
              value={
                sorted.filter((a) => {
                  const m = metaFor(
                    a.type,
                    identity.classes.text,
                    identity.classes.bg,
                    identity.classes.border,
                  );
                  return m.bucket === "reviews";
                }).length
              }
            />
            <SummaryStat
              label="Consensus reached"
              value={
                sorted.filter((a) => {
                  const m = metaFor(
                    a.type,
                    identity.classes.text,
                    identity.classes.bg,
                    identity.classes.border,
                  );
                  return m.bucket === "consensus";
                }).length
              }
            />
            <SummaryStat
              label="New members"
              value={
                sorted.filter(
                  (a) => a.type === "expert_joined" || a.type === "candidate_joined",
                ).length
              }
            />
            <SummaryStat
              label="Stake events"
              value={
                sorted.filter((a) => {
                  const m = metaFor(
                    a.type,
                    identity.classes.text,
                    identity.classes.bg,
                    identity.classes.border,
                  );
                  return m.bucket === "stake";
                }).length
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">
            Top contributors today
          </span>
          {experts.slice(0, 3).map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2.5 py-1.5"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                {e.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 text-sm text-foreground truncate">
                {e.fullName}
              </div>
              <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Award className="w-3 h-3" />
                {e.totalReviews ?? 0} reviews
              </div>
            </div>
          ))}
          {experts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No contributor activity yet.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="font-display text-[22px] text-foreground leading-none">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
