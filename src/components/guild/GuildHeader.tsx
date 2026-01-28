"use client";

import { Users, Award, TrendingUp, DollarSign } from "lucide-react";
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
  };
}

export function GuildHeader({ guild }: GuildHeaderProps) {
  const GuildIcon = getGuildIcon(guild.name);

  return (
    <>
      {/* Guild Banner */}
      <div className="bg-secondary/50 dark:bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 bg-muted dark:bg-card rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-border flex-shrink-0"
            >
              <GuildIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{guild.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {guild.memberCount} members
                </span>
                <span className="flex items-center gap-1 capitalize">
                  <Award className="w-4 h-4" />
                  {guild.expertRole}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Your Role
            </p>
            <p className="text-3xl font-bold text-foreground capitalize mb-1">
              {guild.expertRole}
            </p>
            <p className="text-xs text-muted-foreground">Member of {guild.name}</p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Reputation Score
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">{guild.reputation}</p>
            <p className="text-xs text-muted-foreground">
              {guild.earnings.totalPoints} points earned
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Earnings
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">
              ${guild.earnings.totalEndorsementEarnings.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">From endorsements</p>
          </div>
        </div>
      </div>
    </>
  );
}
