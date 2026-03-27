"use client";

import { Users, Award, Target, Shield, User } from "lucide-react";
import { getGuildIcon } from "@/lib/guildHelpers";
import { formatVetd } from "@/lib/utils";

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
}

export function GuildHeader({ guild, onStakeClick }: GuildHeaderProps) {
  const GuildIcon = getGuildIcon(guild.name);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ═══ BENTO GRID ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-3 mb-3">

        {/* ── Identity + Description (left, spans 2 rows) ── */}
        <div className="md:row-span-2 rounded-xl border border-border p-8 animate-fade-up">
          <div className="w-14 h-14 rounded-xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center mb-4">
            <GuildIcon className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground mb-2">
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

        {/* ── Your Position (right, row 1) ── */}
        <div className=" rounded-xl border border-border p-6 flex flex-col animate-fade-up animate-delay-100">
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
              style={{ width: guild.expertRole === "master" ? "100%" : guild.expertRole === "craftsman" ? "66%" : "33%" }}
            />
          </div>
          <div className="font-mono text-xs text-muted-foreground mb-4">
            {guild.expertRole === "master" ? "Max rank achieved" : `Progressing to next rank`}
          </div>
          <div className="w-full h-px bg-border/60 mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Earnings</span>
            <span>
              <span className="font-mono text-xl font-bold text-positive">
                {formatVetd(guild.earnings?.totalEndorsementEarnings)}
              </span>
              <span className="font-mono text-xs text-muted-foreground ml-1">VETD</span>
            </span>
          </div>
        </div>

        {/* ── Health Stats (left, row 2) — handled by GuildStatsPanel ── */}

        {/* ── Staking (right, row 2) ── */}
        <div className=" rounded-xl border border-border p-6 flex flex-col justify-center animate-fade-up animate-delay-200">
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
        </div>
      </div>
    </div>
  );
}
