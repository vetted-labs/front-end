"use client";
import { useRouter } from "next/navigation";
import { getGuildIcon } from "@/lib/guildHelpers";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Badge, getRankBadgeVariant } from "./ui/badge";
import { Calendar, TrendingUp, DollarSign, Users } from "lucide-react";
import type { ExpertGuild } from "@/types";

interface GuildMembershipCardProps {
  guild: ExpertGuild;
  variant?: "default" | "compact";
}

const rankExplanation: Record<string, string> = {
  recruit: "Entry-level guild member. Building reputation and learning the vetting process.",
  craftsman: "Experienced member with proven track record. Trusted for standard proposals.",
  master: "Elite member with exceptional accuracy. Highest influence in guild decisions.",
};

const getRankExplanation = (role: string): string => {
  return rankExplanation[role] || `Guild member with ${role} rank.`;
};


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export function GuildMembershipCard({ guild, variant = "default" }: GuildMembershipCardProps) {
  const router = useRouter();
  const GuildIcon = getGuildIcon(guild.name);
  const totalProposals = guild.pendingProposals + guild.ongoingProposals + guild.closedProposals;

  const handleClick = () => {
    router.push(`/guilds/${guild.id}`);
  };

  if (variant === "compact") {
    return (
      <div
        onClick={handleClick}
        className="bg-card rounded-xl shadow-md border border-border/50 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 transition-all duration-300 overflow-hidden cursor-pointer"
      >
        {/* Branded Guild Header - Compact */}
        <div className="bg-secondary/50 dark:bg-muted/50 px-4 py-3 rounded-t-xl border-b border-border">
          <div className="flex items-start gap-2.5">
            {/* Guild Icon Badge with Nested Gradients */}
            <div className="w-10 h-10 bg-muted dark:bg-card rounded-lg flex items-center justify-center shadow-md ring-2 ring-border group-hover:scale-110 transition-transform duration-200">
              <GuildIcon className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Guild Name & Rank */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-base mb-1 truncate">
                {guild.name}
              </h4>
              <div className="inline-flex items-center gap-2">
                <Badge variant={getRankBadgeVariant(guild.expertRole)} className="text-[10px] uppercase tracking-wide">
                  {guild.expertRole}
                </Badge>
                <InfoTooltip content={getRankExplanation(guild.expertRole)} side="right" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Stats Section - Compact */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Reputation - Primary Metric */}
            <div className="bg-secondary dark:bg-muted rounded-lg p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reputation</p>
              </div>
              <p className="text-xl font-bold text-foreground">{guild.reputation}</p>
            </div>

            {/* Earnings - Primary Metric */}
            <div className="bg-secondary dark:bg-muted rounded-lg p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Earned</p>
              </div>
              <p className="text-xl font-bold text-foreground">${guild.totalEarnings}</p>
            </div>
          </div>
        </div>

        {/* Simplified Footer - Compact */}
        {guild.joinedAt && (
          <div className="px-4 pb-3 pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Member since {formatDate(guild.joinedAt)}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default variant with full stats
  return (
    <div
      onClick={handleClick}
      className="bg-card rounded-xl shadow-md border border-border/50 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 transition-all duration-300 overflow-hidden group cursor-pointer"
    >
      {/* Branded Guild Header */}
      <div className="bg-secondary/50 dark:bg-muted/50 px-5 py-4 rounded-t-xl border-b border-border">
        <div className="flex items-center gap-3">
          {/* Guild Icon Badge with Nested Gradients */}
          <div className="w-14 h-14 bg-muted dark:bg-card rounded-xl flex items-center justify-center shadow-md ring-2 ring-border group-hover:scale-110 transition-transform duration-200">
            <GuildIcon className="w-7 h-7 text-muted-foreground" />
          </div>

          {/* Guild Name & Rank */}
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-lg mb-0.5">
              {guild.name}
            </h3>
            <div className="inline-flex items-center gap-2">
              <Badge variant={getRankBadgeVariant(guild.expertRole)} className="text-xs uppercase tracking-wide">
                {guild.expertRole}
              </Badge>
              <InfoTooltip content={getRankExplanation(guild.expertRole)} side="right" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Reputation - Primary Metric */}
          <div className="bg-secondary dark:bg-muted rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reputation</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{guild.reputation}</p>
          </div>

          {/* Earnings - Primary Metric */}
          <div className="bg-secondary dark:bg-muted rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Earned</p>
            </div>
            <p className="text-2xl font-bold text-foreground">${guild.totalEarnings}</p>
          </div>
        </div>
      </div>

      {/* Simplified Proposal Stats Grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 bg-secondary/50 dark:bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm font-bold text-foreground">{guild.pendingProposals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </div>
          <div className="text-center p-2.5 bg-secondary/50 dark:bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm font-bold text-foreground">{guild.ongoingProposals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ongoing</p>
          </div>
          <div className="text-center p-2.5 bg-secondary/50 dark:bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm font-bold text-foreground">{totalProposals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="px-5 pb-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{guild.memberCount} members</span>
          </div>
          {guild.joinedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Since {formatDate(guild.joinedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
