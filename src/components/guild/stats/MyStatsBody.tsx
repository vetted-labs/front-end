"use client";

import {
  Activity,
  Award,
  CheckCircle,
  Clock,
  FileText,
  Target,
  ThumbsDown,
  ThumbsUp,
  Briefcase,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";
import type {
  GuildPersonalStats,
  GuildMyStatsAverages,
  GuildRecentActivity,
} from "@/types";

interface MyStatsBodyProps {
  stats: GuildPersonalStats;
  guildAverages: GuildMyStatsAverages;
  recentActivity: GuildRecentActivity[];
  isExpert: boolean;
  hasAverages: boolean;
}

export function MyStatsBody({
  stats,
  guildAverages,
  recentActivity,
  isExpert,
  hasAverages,
}: MyStatsBodyProps) {
  return (
    <div className="space-y-6">
      {/* Performance overview */}
      <Section icon={<Target className="w-3.5 h-3.5" />} title="Performance overview">
        <div className="grid sm:grid-cols-2 gap-5">
          {isExpert ? (
            <>
              <PerfRow
                icon={<FileText className="w-4 h-4" />}
                label="Reviews given"
                value={stats.reviewsGiven}
                avg={hasAverages ? guildAverages.averageReviews : undefined}
              />
              <PerfRow
                icon={
                  <CheckCircle
                    className={cn("w-4 h-4", STATUS_COLORS.positive.icon)}
                  />
                }
                label="Approval rate"
                value={`${stats.approvalRate}%`}
                numericValue={stats.approvalRate}
                avg={
                  hasAverages && guildAverages.averageApprovalRate > 0
                    ? guildAverages.averageApprovalRate
                    : undefined
                }
                avgSuffix="%"
              />
              <PerfRow
                icon={
                  <Clock className={cn("w-4 h-4", STATUS_COLORS.warning.icon)} />
                }
                label="Response time"
                value={stats.responseTime || "N/A"}
                avg={
                  hasAverages && guildAverages.averageResponseTime !== "N/A"
                    ? guildAverages.averageResponseTime
                    : undefined
                }
              />
              <PerfRow
                icon={<Users className={cn("w-4 h-4", STATUS_COLORS.info.icon)} />}
                label="Candidates approved"
                value={stats.candidatesApproved}
                hint={`${stats.candidatesRejected} rejected`}
              />
            </>
          ) : (
            <>
              <PerfRow
                icon={<Briefcase className="w-4 h-4" />}
                label="Jobs applied"
                value={stats.jobsAppliedTo}
              />
              <PerfRow
                icon={<Users className={cn("w-4 h-4", STATUS_COLORS.info.icon)} />}
                label="Interviews"
                value={stats.interviewsReceived}
              />
              <PerfRow
                icon={
                  <CheckCircle
                    className={cn("w-4 h-4", STATUS_COLORS.positive.icon)}
                  />
                }
                label="Offers received"
                value={stats.offersReceived}
              />
              <PerfRow
                icon={
                  <FileText className={cn("w-4 h-4", STATUS_COLORS.warning.icon)} />
                }
                label="Reviews received"
                value={stats.reviewsReceived}
              />
            </>
          )}
        </div>
      </Section>

      {/* Endorsements */}
      <Section icon={<Award className="w-3.5 h-3.5" />} title="Endorsements">
        <div className="grid sm:grid-cols-2 gap-3">
          <EndorsementTile
            tone="positive"
            icon={<ThumbsUp className="w-4 h-4" />}
            label="Received"
            value={stats.endorsementsReceived}
            caption="From guild members"
          />
          <EndorsementTile
            tone="info"
            icon={<ThumbsUp className="w-4 h-4" />}
            label="Given"
            value={stats.endorsementsGiven}
            caption="To other members"
          />
        </div>
      </Section>

      {/* Recent activity */}
      <Section
        icon={<Activity className="w-3.5 h-3.5" />}
        title="Recent activity"
        meta={`${recentActivity.length} entr${recentActivity.length === 1 ? "y" : "ies"}`}
      >
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No recent activity yet — start reviewing or applying to build history.
          </p>
        ) : (
          <ol className="space-y-2">
            {recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-colors"
              >
                <span className="mt-0.5">
                  {getActivityOutcomeIcon(activity.outcome)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {activity.title}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.details}
                    </p>
                  )}
                  <p className="text-[10.5px] text-muted-foreground/70 mt-1.5 tabular-nums">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

/* ── Inline helpers ─────────────────────────────────────────── */

function getActivityOutcomeIcon(outcome?: string) {
  switch (outcome) {
    case "positive":
      return (
        <CheckCircle className={cn("w-4 h-4", STATUS_COLORS.positive.icon)} />
      );
    case "negative":
      return (
        <ThumbsDown className={cn("w-4 h-4", STATUS_COLORS.negative.icon)} />
      );
    default:
      return <Clock className={cn("w-4 h-4", STATUS_COLORS.info.icon)} />;
  }
}

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PerfRow({
  icon,
  label,
  value,
  numericValue,
  avg,
  avgSuffix,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  numericValue?: number;
  avg?: number | string;
  avgSuffix?: string;
  hint?: string;
}) {
  const numericMine =
    typeof numericValue === "number"
      ? numericValue
      : typeof value === "number"
        ? value
        : undefined;
  const showCompare =
    typeof avg === "number" && typeof numericMine === "number";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-muted-foreground/80">{icon}</span>
          {label}
        </span>
        <span className="text-2xl font-bold text-foreground font-display tabular-nums">
          {value}
        </span>
      </div>
      {avg !== undefined && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span>
            Guild avg:{" "}
            <span className="tabular-nums text-foreground/80">
              {avg}
              {avgSuffix ?? ""}
            </span>
          </span>
          {showCompare && (
            <ComparisonHint
              myValue={numericMine!}
              avgValue={avg as number}
            />
          )}
        </div>
      )}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ComparisonHint({
  myValue,
  avgValue,
}: {
  myValue: number;
  avgValue: number;
}) {
  if (avgValue <= 0) return null;
  const diff = myValue - avgValue;
  const pct = (diff / avgValue) * 100;
  if (Math.abs(pct) < 1) {
    return (
      <span className="text-[10.5px] font-medium flex items-center gap-1 tabular-nums text-muted-foreground">
        <Minus className="w-3 h-3" />
        On par
      </span>
    );
  }
  const isUp = diff > 0;
  const Icon = isUp ? ArrowUp : ArrowDown;
  const tone = isUp ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text;
  return (
    <span
      className={cn(
        "text-[10.5px] font-medium flex items-center gap-1 tabular-nums",
        tone,
      )}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(pct).toFixed(0)}% {isUp ? "above" : "below"} avg
    </span>
  );
}

function EndorsementTile({
  tone,
  icon,
  label,
  value,
  caption,
}: {
  tone: "positive" | "info";
  icon: React.ReactNode;
  label: string;
  value: number;
  caption: string;
}) {
  const colors = STATUS_COLORS[tone];
  return (
    <div className={cn("rounded-xl border p-4", colors.bgSubtle, colors.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={colors.icon}>{icon}</span>
        <span
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.16em]",
            colors.text,
          )}
        >
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-display text-3xl font-bold tabular-nums",
          colors.text,
        )}
      >
        {value}
      </p>
      <p className={cn("text-[11px] mt-0.5 opacity-80", colors.text)}>
        {caption}
      </p>
    </div>
  );
}
