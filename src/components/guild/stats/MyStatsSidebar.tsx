"use client";

import {
  Star,
  Trophy,
  Activity,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { GuildPersonalStats } from "@/types";

type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info" | "pending";

interface MyStatsSidebarProps {
  stats: GuildPersonalStats;
  guildRep: number;
  maxRep: number;
  tone: StatusTone;
  isExpert: boolean;
  guildId: string;
  onNavigate: (path: string) => void;
}

export function MyStatsSidebar({
  stats,
  guildRep,
  maxRep,
  tone,
  isExpert,
  guildId,
  onNavigate,
}: MyStatsSidebarProps) {
  return (
    <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
      {/* Reputation ring */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4 text-center">
          Reputation ring
        </p>
        <div className="flex justify-center">
          <ScoreRing reputation={guildRep} max={maxRep} tone={tone} />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {tone === "positive"
            ? "Strong standing — keep it up."
            : tone === "warning"
              ? "Solid foundation — one tier away from strong."
              : tone === "negative"
                ? "Below average — review more to rebuild."
                : "Just getting started — submit your first review."}
        </p>
      </div>

      {/* At-a-glance KeyValues */}
      <SidebarCard title="At a glance">
        <KeyValue
          icon={<Star className="w-3.5 h-3.5" />}
          label="Guild reputation"
          value={`${guildRep} pts`}
        />
        <KeyValue
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Contribution"
          value={`${stats.contributionScore}`}
        />
        <KeyValue
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Activity score"
          value={`${stats.activityScore}/100`}
        />
        {isExpert && (
          <KeyValue
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Avg confidence"
            value={`${stats.averageConfidenceLevel}/5`}
          />
        )}
      </SidebarCard>

      {/* Requirements for next role */}
      {stats.nextRole &&
        stats.requirementsForNextRole &&
        stats.requirementsForNextRole.length > 0 && (
          <SidebarCard title={`Path to ${stats.nextRole}`}>
            <ul className="space-y-2">
              {stats.requirementsForNextRole.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-[12px] text-muted-foreground leading-snug"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </SidebarCard>
        )}

      {/* Quick actions */}
      <SidebarCard title="Quick actions">
        <QuickAction onClick={() => onNavigate(`/guilds/${guildId}`)} primary>
          Guild dashboard
        </QuickAction>
        <QuickAction onClick={() => onNavigate("/browse/jobs")}>
          Browse jobs
        </QuickAction>
        <QuickAction onClick={() => onNavigate("/candidate/profile")}>
          My profile
        </QuickAction>
      </SidebarCard>
    </aside>
  );
}

/* ── Inline helpers ─────────────────────────────────────────── */

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors",
        primary
          ? "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15"
          : "bg-muted border border-border text-foreground hover:bg-muted/70",
      )}
    >
      {children}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

function ScoreRing({
  reputation,
  max,
  tone,
}: {
  reputation: number;
  max: number;
  tone: StatusTone;
}) {
  const size = 168;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(reputation / max, 1) * 100 : 0;
  const dashOffset = circumference - (percent / 100) * circumference;
  const toneTextClass = STATUS_COLORS[tone].text;

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn("transition-all duration-700", toneTextClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            "text-3xl font-bold font-display tabular-nums leading-none",
            toneTextClass,
          )}
        >
          {reputation.toLocaleString()}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
          Reputation
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {percent.toFixed(0)}% of {max.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
