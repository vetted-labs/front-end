"use client";

import { Users, Award, TrendingUp, DollarSign, Target, Zap, Trophy, Shield } from "lucide-react";
import { getGuildIcon } from "@/lib/guildHelpers";

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
    <>
      {/* Guild Banner */}
      <div className="border-b border-border bg-card/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div
                className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-amber-400/15 via-orange-500/10 to-amber-500/15 border border-border flex items-center justify-center shadow-md"
              >
                <GuildIcon className="w-9 h-9 text-primary" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-[11px] uppercase tracking-[0.25em] text-primary mb-3">
                  Guild Protocol
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
                  {guild.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-primary" />
                    {guild.memberCount || 0} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-primary" />
                    {guild.candidateCount || 0} candidates
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    <Award className="w-4 h-4 text-primary" />
                    {guild.expertRole}
                  </span>
                </div>
                {onStakeClick && (
                  <button
                    onClick={onStakeClick}
                    className="group relative inline-flex items-center gap-2.5 px-7 py-3 text-base font-semibold text-white rounded-xl border border-primary/30 bg-primary/15 backdrop-blur-md hover:bg-primary/25 hover:border-primary/50 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Shield className="w-5 h-5 text-primary group-hover:text-primary/80 transition-colors" />
                    Stake VETD
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Open Roles</p>
                <p className="text-xl font-semibold text-foreground">{guild.openPositions || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Reputation</p>
                <p className="text-xl font-semibold text-foreground">{guild.reputation || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Overview */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Guild Overview</h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
            {guild.description}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-primary">
                <Target className="w-4 h-4" />
                <p className="text-xl font-semibold text-foreground">{guild.totalProposalsReviewed || 0}</p>
              </div>
              <p className="text-xs text-muted-foreground">Applications Reviewed</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-primary">
                <Zap className="w-4 h-4" />
                <p className="text-xl font-semibold text-foreground">{guild.averageApprovalTime || "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground">Avg Approval Time</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-primary">
                <Trophy className="w-4 h-4" />
                <p className="text-xl font-semibold text-foreground">{guild.candidateCount || 0}</p>
              </div>
              <p className="text-xs text-muted-foreground">Active Candidates</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-primary">
                <Shield className="w-4 h-4" />
                <p className="text-xl font-semibold text-foreground">
                  {guild.totalVetdStaked != null
                    ? Number(guild.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "0"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Total VETD Staked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Your Performance</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Your Role
            </p>
            <p className="text-3xl font-semibold text-foreground capitalize mb-1">
              {guild.expertRole}
            </p>
            <p className="text-xs text-muted-foreground">Member of {guild.name}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Reputation Score
            </p>
            <p className="text-3xl font-semibold text-foreground mb-1">{guild.reputation}</p>
            <p className="text-xs text-muted-foreground">
              {guild.earnings?.totalPoints ?? 0} points earned
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Earnings
            </p>
            <p className="text-3xl font-semibold text-foreground mb-1">
              ${(guild.earnings?.totalEndorsementEarnings ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">From endorsements</p>
          </div>
        </div>
      </div>
    </>
  );
}
