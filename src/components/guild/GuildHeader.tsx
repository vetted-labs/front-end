"use client";

import { Users, Award, Target, Shield, User } from "lucide-react";
import { GuildAvatar } from "@/components/ui/guild";
import { formatVetd } from "@/lib/utils";
import { Divider } from "@/components/ui/divider";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { GUILD_RANK_ORDER } from "@/config/constants";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";

function getRankProgress(rank: string): number {
  const index = GUILD_RANK_ORDER.indexOf(rank.toLowerCase());
  if (index < 0) return 0;
  // 5 ranks: recruit=0%, apprentice=25%, craftsman=50%, officer=75%, master=100%
  return (index / (GUILD_RANK_ORDER.length - 1)) * 100;
}

interface GuildHeaderProps {
  guild: {
    name: string;
    memberCount: number;
    expertRole: string;
    reputation: number;
    earnings?: {
      totalPoints: number;
      totalEndorsementEarnings: number;
    };
    description: string;
    totalProposalsReviewed: number;
    averageApprovalTime: string;
    candidateCount: number;
    openPositions: number;
    totalVetdStaked?: number;
  };
  onStakeClick?: () => void;
  /** When false, hides the "Your Position" and "Guild Staking" sidebar cards */
  isMember?: boolean;
}

export function GuildHeader({ guild, onStakeClick, isMember = true }: GuildHeaderProps) {
  const identity = getGuildIdentity(guild.name);
  // Drives the per-guild signature gradient line + banner + icon-ring tint,
  // mirroring GuildPublicHero. Inline style keeps the gradient unique without
  // exploding the tailwind safelist.
  const gcHex = identity.hex;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ═══ BENTO GRID ═══ */}
      <div className={`grid grid-cols-1 ${isMember ? "md:grid-cols-[1fr_minmax(0,340px)]" : ""} gap-3 mb-3`}>

        {/* ── Identity + Description (left, spans 2 rows) — public-hero treatment ── */}
        <div
          className="md:row-span-2 relative overflow-hidden rounded-[20px] border border-surface-border bg-surface-1 animate-fade-up"
          {...dataTourTarget(TOUR_TARGETS.guildStandards)}
        >
          {/* 3px guild signature line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] z-[2]"
            style={{
              background: `linear-gradient(90deg, ${gcHex} 0%, ${gcHex} 30%, transparent 100%)`,
            }}
          />

          {/* Banner — diagonal pattern + radial guild-color gradient */}
          <div
            className="h-[140px] relative"
            style={{
              backgroundImage: `radial-gradient(ellipse 500px 180px at 80% 0%, ${gcHex}33, transparent 70%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 0L40 40M40 0L0 40' stroke='${encodeURIComponent(
                gcHex,
              )}' stroke-opacity='0.08' stroke-width='0.5'/></svg>")`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, transparent 50%, hsl(var(--surface-1)) 100%)",
              }}
            />
          </div>

          {/* Body — icon tile overlaps the banner */}
          <div className="px-7 pb-7 -mt-12 relative z-10">
            <div className="mb-4">
              <span
                className="inline-flex items-center justify-center w-24 h-24 rounded-[20px] border"
                style={{
                  boxShadow: `0 8px 24px ${gcHex}33, 0 0 0 4px hsl(var(--surface-1))`,
                }}
              >
                <GuildAvatar guild={guild.name} size="lg" rounded="xl" />
              </span>
            </div>

            <h1 className="font-display text-[32px] sm:text-[36px] font-bold leading-[1.1] tracking-[-0.01em] text-foreground mb-2">
              {guild.name}
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xl">
              {guild.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {guild.memberCount || 0} members
              </span>
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-3.5 h-3.5" />
                {guild.candidateCount || 0} candidates
              </span>
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground capitalize">
                <Award className="w-3.5 h-3.5" />
                {guild.expertRole}
              </span>
            </div>

            {onStakeClick && (
              <button
                onClick={onStakeClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/[0.08] border border-primary/20 text-primary font-display text-sm font-bold transition-all hover:bg-primary/[0.15] hover:border-primary/30"
              >
                <Shield className="w-4 h-4" />
                Stake VETD
              </button>
            )}
          </div>
        </div>

        {/* ── Your Position (right, row 1) — member only ── */}
        {isMember && <div
          className="rounded-[20px] border border-surface-border bg-surface-1 p-6 flex flex-col animate-fade-up animate-delay-100"
          {...dataTourTarget(TOUR_TARGETS.guildYourPosition)}
        >
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground mb-4 flex items-center gap-2">
            <User className="w-3 h-3 text-primary" />
            Your Position
          </div>
          <div className="font-mono text-3xl font-bold text-foreground tracking-tight mb-0.5">
            {guild.reputation || 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Reputation</div>
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/[0.08] border border-primary/20 text-xs font-bold uppercase tracking-[1px] text-primary">
              <span className="w-1 h-1 rounded-full bg-primary" />
              {guild.expertRole}
            </span>
          </div>
          <div className="w-full h-[3px] rounded-full bg-border/40 overflow-hidden mb-1">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${getRankProgress(guild.expertRole)}%` }}
            />
          </div>
          <div className="font-mono text-xs text-muted-foreground mb-4">
            {guild.expertRole === "master" ? "Max rank achieved" : `Progressing to next rank`}
          </div>
          <Divider className="mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Earnings</span>
            <span>
              <span className="font-mono text-xl font-bold text-positive">
                {formatVetd(guild.earnings?.totalEndorsementEarnings)}
              </span>
              <span className="font-mono text-xs text-muted-foreground ml-1">VETD</span>
            </span>
          </div>
        </div>}

        {/* ── Health Stats (left, row 2) — handled by GuildStatsPanel ── */}

        {/* ── Staking (right, row 2) — member only ── */}
        {isMember && <div
          className="rounded-[20px] border border-surface-border bg-surface-1 p-6 flex flex-col justify-center animate-fade-up animate-delay-200"
          {...dataTourTarget(TOUR_TARGETS.guildStakeWidget)}
        >
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-muted-foreground mb-2.5 flex items-center gap-2">
            <Shield className="w-3 h-3 text-primary" />
            Guild Staking
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-3xl font-bold text-foreground">
              {guild.totalVetdStaked != null
                ? Number(guild.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "0"}
            </span>
            <span className="font-mono text-xs font-medium text-primary">VETD</span>
          </div>
          <div className="text-xs text-muted-foreground mb-3.5">Total staked by all members</div>
          {onStakeClick && (
            <button
              onClick={onStakeClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/[0.08] border border-primary/20 text-primary font-display text-xs font-bold transition-all hover:bg-primary/[0.15] w-fit"
            >
              <Shield className="w-3.5 h-3.5" />
              Stake VETD
            </button>
          )}
        </div>}
      </div>
    </div>
  );
}
