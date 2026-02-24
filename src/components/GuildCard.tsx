"use client";

import { getGuildIcon, formatGuildTooltipContent, getGuildPreviewDescription } from "@/lib/guildHelpers";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Users, Briefcase, UserCheck, ArrowRight, CheckCircle2, Calendar, DollarSign, Star, Coins } from "lucide-react";
import type { Guild, ExpertGuild, ExpertRole } from "@/types";

/** Union of public Guild and ExpertGuild fields, plus card-specific extras. */
type GuildCardGuild = Partial<Guild> &
  Partial<ExpertGuild> & {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    stakedAmount?: string;
  };

interface GuildCardProps {
  guild: GuildCardGuild;
  variant: "browse" | "membership" | "dashboard";
  membershipSubVariant?: "default" | "compact";
  onViewDetails?: (guildId: string) => void;
  showDescription?: boolean;
}

export function GuildCard({
  guild,
  variant,
  onViewDetails,
  showDescription = true,
}: GuildCardProps) {
  const GuildIcon = getGuildIcon(guild.name);
  // Membership variant (shared styling with public guild cards)
  if (variant === "membership") {
    const totalProposals =
      (guild.pendingProposals || 0) + (guild.ongoingProposals || 0) + (guild.closedProposals || 0);
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    };

    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.06),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)] opacity-60" />
        <div className="pointer-events-none absolute -top-24 right-[-10%] h-48 w-48 rounded-full bg-orange-500/5 dark:bg-orange-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-10%] h-48 w-48 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-primary/50 to-amber-400/20 dark:from-amber-500/30 dark:via-orange-400/70 dark:to-amber-400/30 opacity-80" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/10 border border-border flex items-center justify-center">
                <GuildIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {guild.name}
                </h3>
                {guild.expertRole && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/30">
                    {guild.expertRole}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-center gap-1 mb-1 text-primary">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-lg font-semibold text-foreground">{guild.reputation || 0}</p>
              <p className="text-xs text-muted-foreground">Reputation</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-center gap-1 mb-1 text-primary">
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                ${Number(guild.totalEarnings || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-center gap-1 mb-1 text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-lg font-semibold text-foreground">{totalProposals}</p>
              <p className="text-xs text-muted-foreground">Proposals</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{guild.memberCount || 0} members</span>
            </div>
            {guild.joinedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Since {formatDate(guild.joinedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Browse variant (public guild browsing and expert dashboard)
  if (variant === "browse") {
    // Check if this is an expert view (has proposal data)
    const isExpertView = guild.pendingProposals !== undefined || guild.ongoingProposals !== undefined;

    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.06),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)] opacity-60" />
        <div className="pointer-events-none absolute -top-24 right-[-10%] h-48 w-48 rounded-full bg-orange-500/5 dark:bg-orange-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-10%] h-48 w-48 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-primary/50 to-amber-400/20 dark:from-amber-500/30 dark:via-orange-400/70 dark:to-amber-400/30 opacity-80" />

        <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/10 border border-border flex items-center justify-center">
              <GuildIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {guild.name}
              </h3>
              {guild.expertRole && (
                <p className="text-xs text-muted-foreground capitalize">
                  {guild.expertRole} • {guild.memberCount} members
                  {guild.pendingApplications !== undefined && guild.pendingApplications > 0 && (
                    <span className="text-primary font-medium"> • {guild.pendingApplications} pending</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <InfoTooltip content={formatGuildTooltipContent(guild.name)} side="bottom" />
        </div>

        {/* Description */}
        {showDescription && !isExpertView && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {getGuildPreviewDescription(guild.name)}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {isExpertView ? (
            // Expert view: show proposals
            <>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground">{(guild.pendingProposals || 0) + (guild.pendingApplications || 0)}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{guild.stakedAmount ? parseFloat(guild.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}</p>
                <p className="text-xs text-muted-foreground">Staked</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground">${guild.totalEarnings || 0}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
            </>
          ) : (
            // Public view: show experts, members, jobs
            <>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground">{guild.expertCount || 0}</p>
                <p className="text-xs text-muted-foreground">Experts</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground">{guild.totalProposalsReviewed || 0}</p>
                <p className="text-xs text-muted-foreground">Proposals</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground">{guild.jobCount || 0}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    );
  }

  // Dashboard variant (expert dashboard with proposals)
  if (variant === "dashboard") {
    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border hover:border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
      >
        {/* Guild Banner with Color and Icon */}
        <div className="bg-secondary/50 dark:bg-muted/50 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted dark:bg-card rounded-xl flex items-center justify-center shadow-md ring-2 ring-border">
              <GuildIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-0.5">
                {guild.name}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">
                {guild.expertRole} • {guild.memberCount} members
                {guild.pendingApplications !== undefined && guild.pendingApplications > 0 && (
                  <span className="text-primary font-medium"> • {guild.pendingApplications} pending</span>
                )}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>

        {/* Guild Stats - Using design system tokens */}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-secondary dark:bg-muted rounded border border-border">
              <p className="font-semibold text-foreground">{(guild.pendingProposals || 0) + (guild.pendingApplications || 0)}</p>
              <p className="text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-2 bg-secondary dark:bg-muted rounded border border-border">
              <p className="font-semibold text-foreground">{guild.stakedAmount ? parseFloat(guild.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}</p>
              <p className="text-muted-foreground">Staked</p>
            </div>
            <div className="text-center p-2 bg-secondary dark:bg-muted rounded border border-border">
              <p className="font-semibold text-foreground">${guild.totalEarnings || 0}</p>
              <p className="text-muted-foreground">Earned</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
