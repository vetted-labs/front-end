"use client";

import { Users, Award, TrendingUp, DollarSign, Target, Zap, Trophy, Shield } from "lucide-react";
import { getGuildIcon } from "@/lib/guildHelpers";

interface GuildHeaderProps {
  guild: {
    name: string;
    memberCount: number;
    expertRole: string;
    reputation: number;
    earnings: {
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
      <div className="border-b border-white/10 bg-[#0b0f1a]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div
                className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-amber-500/20 border border-white/10 flex items-center justify-center shadow-[0_20px_60px_rgba(251,146,60,0.2)]"
              >
                <GuildIcon className="w-9 h-9 text-amber-200" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.25em] text-amber-200/80 mb-3">
                  Guild Protocol
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-100 mb-2">
                  {guild.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-amber-200" />
                    {guild.memberCount || 0} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-amber-200" />
                    {guild.candidateCount || 0} candidates
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    <Award className="w-4 h-4 text-amber-200" />
                    {guild.expertRole}
                  </span>
                </div>
                {onStakeClick && (
                  <button
                    onClick={onStakeClick}
                    className="group relative inline-flex items-center gap-2.5 px-7 py-3 text-base font-semibold text-white rounded-xl border border-orange-400/30 bg-orange-500/15 backdrop-blur-md hover:bg-orange-500/25 hover:border-orange-400/50 transition-all duration-200 shadow-[0_0_20px_rgba(251,146,60,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(251,146,60,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    <Shield className="w-5 h-5 text-orange-300 group-hover:text-orange-200 transition-colors" />
                    Stake VETD
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-xs text-slate-400">Open Roles</p>
                <p className="text-xl font-semibold text-slate-100">{guild.openPositions || 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-xs text-slate-400">Reputation</p>
                <p className="text-xl font-semibold text-slate-100">{guild.reputation || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Overview */}
      <div className="border-b border-white/10 bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Guild Overview</h2>
          <p className="text-base md:text-lg text-slate-300 mb-6 line-clamp-3">
            {guild.description}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-amber-200">
                <Target className="w-4 h-4" />
                <p className="text-xl font-semibold text-slate-100">{guild.totalProposalsReviewed || 0}</p>
              </div>
              <p className="text-xs text-slate-400">Proposals Reviewed</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-amber-200">
                <Zap className="w-4 h-4" />
                <p className="text-xl font-semibold text-slate-100">{guild.averageApprovalTime || "—"}</p>
              </div>
              <p className="text-xs text-slate-400">Avg Approval Time</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-amber-200">
                <Trophy className="w-4 h-4" />
                <p className="text-xl font-semibold text-slate-100">{guild.candidateCount || 0}</p>
              </div>
              <p className="text-xs text-slate-400">Active Candidates</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-amber-200">
                <Shield className="w-4 h-4" />
                <p className="text-xl font-semibold text-slate-100">
                  {guild.totalVetdStaked != null
                    ? Number(guild.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "0"}
                </p>
              </div>
              <p className="text-xs text-slate-400">Total VETD Staked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-100 mb-6">Your Performance</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-400/20">
                <Award className="w-6 h-6 text-amber-200" />
              </div>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Your Role
            </p>
            <p className="text-3xl font-semibold text-slate-100 capitalize mb-1">
              {guild.expertRole}
            </p>
            <p className="text-xs text-slate-400">Member of {guild.name}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-400/20">
                <TrendingUp className="w-6 h-6 text-amber-200" />
              </div>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Reputation Score
            </p>
            <p className="text-3xl font-semibold text-slate-100 mb-1">{guild.reputation}</p>
            <p className="text-xs text-slate-400">
              {guild.earnings.totalPoints} points earned
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-400/20">
                <DollarSign className="w-6 h-6 text-amber-200" />
              </div>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Total Earnings
            </p>
            <p className="text-3xl font-semibold text-slate-100 mb-1">
              ${guild.earnings.totalEndorsementEarnings.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">From endorsements</p>
          </div>
        </div>
      </div>
    </>
  );
}
