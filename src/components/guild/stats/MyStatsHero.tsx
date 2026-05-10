"use client";

import {
  Star,
  Calendar,
  FileText,
  Trophy,
  Activity,
  Briefcase,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { GuildAvatar } from "@/components/ui/guild";
import { STATUS_COLORS, getRankColors } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { GuildPersonalStats, GuildMyStatsAverages } from "@/types";

interface MyStatsHeroProps {
  stats: GuildPersonalStats;
  guildAverages: GuildMyStatsAverages;
  guildName: string;
  guildRep: number;
  maxRep: number;
  hasAverages: boolean;
  isExpert: boolean;
}

export function MyStatsHero({
  stats,
  guildAverages,
  guildName,
  guildRep,
  maxRep,
  hasAverages,
  isExpert,
}: MyStatsHeroProps) {
  const rankColors = getRankColors(stats.role);

  return (
    <>
      {/* ── Hero card ── */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center">
          <GuildAvatar guild={guildName} size="xl" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em]",
                  rankColors.badge,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", rankColors.dot)} />
                <span className="capitalize">{stats.role}</span>
              </span>
              {stats.joinedAt && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(stats.joinedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight flex items-baseline gap-2">
              <Star
                className={cn("w-6 h-6", STATUS_COLORS.warning.icon)}
                fill="currentColor"
              />
              {guildRep.toLocaleString()}
              <span className="text-base text-muted-foreground font-medium">
                / {maxRep.toLocaleString()}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Guild reputation</p>
          </div>

          {/* Right: tier countdown / progression */}
          <div className="lg:w-56">
            {stats.nextRole ? (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Next rank
                </p>
                <p className="font-display text-base font-bold text-foreground capitalize mt-0.5">
                  {stats.nextRole}
                </p>
                <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${stats.progressToNextRole || 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-primary font-semibold mt-1.5 tabular-nums">
                  {stats.progressToNextRole || 0}% complete
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Standing
                </p>
                <p className="font-display text-base font-bold text-foreground mt-0.5">
                  Top tier
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  You&apos;re at the top of the progression ladder.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI strip ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<Star className="w-4 h-4" />}
          label="Guild reputation"
          value={guildRep}
          tone="primary"
          footer={
            hasAverages ? (
              <ComparisonHint
                myValue={guildRep}
                avgValue={guildAverages.averageReputation}
              />
            ) : undefined
          }
        />
        <KpiTile
          icon={
            isExpert ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Briefcase className="w-4 h-4" />
            )
          }
          label={isExpert ? "Reviews given" : "Jobs applied"}
          value={isExpert ? stats.reviewsGiven : stats.jobsAppliedTo}
          tone="info"
          footer={
            isExpert && hasAverages ? (
              <ComparisonHint
                myValue={stats.reviewsGiven}
                avgValue={guildAverages.averageReviews}
              />
            ) : undefined
          }
        />
        <KpiTile
          icon={<Trophy className="w-4 h-4" />}
          label="Contribution"
          value={stats.contributionScore}
          tone="warning"
        />
        <KpiTile
          icon={<Activity className="w-4 h-4" />}
          label="Activity"
          value={`${stats.activityScore}/100`}
          tone={
            stats.activityScore > 70
              ? "positive"
              : stats.activityScore > 40
                ? "warning"
                : "negative"
          }
        />
      </section>
    </>
  );
}

/* ── Inline helpers (must be self-contained per file) ──────── */

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning" | "negative";
  footer?: React.ReactNode;
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
  negative: { bg: "bg-rose-500/10", text: "text-rose-500" },
};

function KpiTile({ icon, label, value, tone, footer }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
            t.bg,
            t.text,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
            {value}
          </p>
        </div>
      </div>
      {footer && <div className="mt-2.5">{footer}</div>}
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
      <p className="text-[10.5px] font-medium flex items-center gap-1 tabular-nums text-muted-foreground">
        <Minus className="w-3 h-3" />
        On par with guild avg
      </p>
    );
  }
  const isUp = diff > 0;
  const Icon = isUp ? ArrowUp : ArrowDown;
  const tone = isUp ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text;
  return (
    <p
      className={cn(
        "text-[10.5px] font-medium flex items-center gap-1 tabular-nums",
        tone,
      )}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(pct).toFixed(0)}% {isUp ? "above" : "below"} avg
    </p>
  );
}
