"use client";

import { getGuildIcon, formatGuildTooltipContent, getGuildPreviewDescription } from "@/lib/guildHelpers";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Users, Briefcase, UserCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { GuildMembershipCard } from "./GuildMembershipCard";

interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertCount?: number;
  jobCount?: number;
  totalProposalsReviewed?: number;
  expertRole?: "recruit" | "craftsman" | "master";
  reputation?: number;
  totalEarnings?: number;
  joinedAt?: string;
  pendingProposals?: number;
  pendingApplications?: number;
  ongoingProposals?: number;
  closedProposals?: number;
}

interface GuildCardProps {
  guild: Guild;
  variant: "browse" | "membership" | "dashboard";
  membershipSubVariant?: "default" | "compact";
  onViewDetails?: (guildId: string) => void;
  showDescription?: boolean;
}

export function GuildCard({
  guild,
  variant,
  membershipSubVariant = "default",
  onViewDetails,
  showDescription = true,
}: GuildCardProps) {
  // Membership variant delegates to GuildMembershipCard
  if (variant === "membership") {
    return <GuildMembershipCard guild={guild} variant={membershipSubVariant} />;
  }

  const GuildIcon = getGuildIcon(guild.name);

  // Browse variant (public guild browsing and expert dashboard)
  if (variant === "browse") {
    // Check if this is an expert view (has proposal data)
    const isExpertView = guild.pendingProposals !== undefined || guild.ongoingProposals !== undefined;

    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all cursor-pointer group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted dark:bg-card rounded-xl flex items-center justify-center">
              <GuildIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
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
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{guild.pendingProposals || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{guild.ongoingProposals || 0}</p>
                <p className="text-xs text-muted-foreground">Ongoing</p>
              </div>
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">${guild.totalEarnings || 0}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
            </>
          ) : (
            // Public view: show experts, members, jobs
            <>
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{guild.expertCount || 0}</p>
                <p className="text-xs text-muted-foreground">Experts</p>
              </div>
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{guild.totalProposalsReviewed || 0}</p>
                <p className="text-xs text-muted-foreground">Proposals</p>
              </div>
              <div className="text-center p-3 bg-secondary dark:bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{guild.jobCount || 0}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </>
          )}
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
              <p className="font-semibold text-foreground">{guild.pendingProposals || 0}</p>
              <p className="text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-2 bg-secondary dark:bg-muted rounded border border-border">
              <p className="font-semibold text-foreground">{guild.ongoingProposals || 0}</p>
              <p className="text-muted-foreground">Ongoing</p>
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
