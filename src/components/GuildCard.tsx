"use client";

import { getGuildIcon, formatGuildTooltipContent, getGuildPreviewDescription } from "@/lib/guildHelpers";
import { formatDateMonthYear, formatVetd } from "@/lib/utils";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Users, ArrowRight, Calendar, DollarSign, Star, Coins } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { Guild, ExpertGuild } from "@/types";

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

  // ── Membership variant (profile "Guild Positions" section) ──
  if (variant === "membership") {
    const totalProposals =
      (guild.pendingProposals || 0) + (guild.ongoingProposals || 0) + (guild.closedProposals || 0);
    const formatDate = (dateString: string) => formatDateMonthYear(dateString);

    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.08)]"
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-border opacity-60" />
        {/* Inner glow */}
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-44 rounded-full bg-primary/[0.06] blur-2xl" />

        <div className="relative p-6">
          {/* Header: Icon + Name + Rank */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-[13px] bg-primary/[0.08] border border-primary/15 flex items-center justify-center flex-shrink-0 transition-shadow">
              <GuildIcon className="w-[22px] h-[22px] text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold font-display text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                {guild.name}
              </h3>
              {guild.expertRole && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/[0.08] border border-primary/20 text-xs font-bold uppercase tracking-[1.1px] text-primary">
                    <span className="w-[5px] h-[5px] rounded-full bg-primary" />
                    {guild.expertRole}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3.5">
            <div className="text-center py-2.5 px-1.5 rounded-[11px] bg-muted/30 border border-border transition-colors group-hover:border-border">
              <div className="font-mono text-base font-medium text-primary mb-0.5">{guild.reputation || 0}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Rep</div>
            </div>
            <div className="text-center py-2.5 px-1.5 rounded-[11px] bg-muted/30 border border-border transition-colors group-hover:border-border">
              <div className="font-mono text-sm font-medium text-positive mb-0.5">{formatVetd(guild.totalEarnings)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Earned</div>
            </div>
            <div className="text-center py-2.5 px-1.5 rounded-[11px] bg-muted/30 border border-border transition-colors group-hover:border-border">
              <div className="font-mono text-base font-medium text-foreground mb-0.5">{totalProposals}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Proposals</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Users className="w-[11px] h-[11px] opacity-50" />
              {guild.memberCount || 0} members
            </span>
            {guild.joinedAt && (
              <span className="flex items-center gap-2">
                <Calendar className="w-[11px] h-[11px] opacity-50" />
                Since {formatDate(guild.joinedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Browse variant (expert dashboard "My Guilds" + public listing) ──
  if (variant === "browse") {
    const isExpertView = guild.pendingProposals !== undefined || guild.ongoingProposals !== undefined;
    const pendingCount = (guild.pendingProposals || 0) + (guild.pendingApplications || 0);
    const isUrgent = isExpertView && pendingCount > 0;

    return (
      <div
        onClick={() => onViewDetails?.(guild.id)}
        className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 ${
          isUrgent
            ? "border-warning/20 hover:border-warning/35 bg-card"
            : "border-border bg-card hover:border-primary/30 hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.08)]"
        }`}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-border opacity-50" />

        <div className="relative">
          {/* Urgent banner */}
          {isUrgent && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-warning/15 bg-warning/5">
              <span className="w-[7px] h-[7px] rounded-full bg-warning animate-glow-pulse" />
              <span className="font-display text-xs font-bold text-warning">
                <span className="font-mono">{pendingCount}</span> pending review{pendingCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-[11px] bg-primary/[0.08] border border-primary/15 flex items-center justify-center flex-shrink-0 transition-shadow">
                <GuildIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold font-display text-foreground group-hover:text-primary transition-colors truncate">
                  {guild.name}
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {guild.expertRole && <span className="capitalize">{guild.expertRole}</span>}
                  {guild.expertRole && <span className="opacity-30">·</span>}
                  <span>{guild.memberCount} members</span>
                </div>
              </div>
              {isExpertView ? (
                <div className="w-[26px] h-[26px] rounded-[7px] bg-muted/20 border border-border/30 flex items-center justify-center text-muted-foreground transition-all group-hover:bg-primary/[0.08] group-hover:border-primary/20 group-hover:text-primary group-hover:translate-x-0.5">
                  <ArrowRight className="w-[13px] h-[13px]" />
                </div>
              ) : (
                <InfoTooltip content={formatGuildTooltipContent(guild.name)} side="bottom" />
              )}
            </div>

            {/* Description (public only) */}
            {showDescription && !isExpertView && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                {getGuildPreviewDescription(guild.name)}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {isExpertView ? (
                <>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="w-[22px] h-[22px] rounded-[6px] bg-primary/[0.08] flex items-center justify-center mx-auto mb-1.5">
                      <Coins className="w-[11px] h-[11px] text-primary" />
                    </div>
                    <div className="font-mono text-base font-bold text-primary">{guild.stakedAmount ? parseFloat(guild.stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Staked</div>
                    <div className="font-mono text-xs text-muted-foreground tracking-wider mt-0.5">VETD</div>
                  </div>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="w-[22px] h-[22px] rounded-[6px] bg-positive/10 flex items-center justify-center mx-auto mb-1.5">
                      <DollarSign className="w-[11px] h-[11px] text-positive" />
                    </div>
                    <div className="font-mono text-base font-bold text-positive">{formatVetd(guild.totalEarnings)}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Earned</div>
                  </div>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="w-[22px] h-[22px] rounded-[6px] bg-muted/20 flex items-center justify-center mx-auto mb-1.5">
                      <Star className="w-[11px] h-[11px] text-muted-foreground" />
                    </div>
                    <div className="font-mono text-base font-bold text-foreground">{guild.reputation || 0}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Rep</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="font-mono text-base font-bold text-foreground">{guild.expertCount || 0}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Experts</div>
                  </div>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="font-mono text-base font-bold text-foreground">{guild.totalProposalsReviewed || 0}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Reviewed</div>
                  </div>
                  <div className="text-center py-2.5 px-1 rounded-[9px] bg-muted/30 border border-border">
                    <div className="font-mono text-base font-bold text-primary">{guild.jobCount || 0}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Open Jobs</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard variant (legacy — redirects to browse) ──
  if (variant === "dashboard") {
    return (
      <GuildCard
        guild={guild}
        variant="browse"
        onViewDetails={onViewDetails}
        showDescription={showDescription}
      />
    );
  }

  return null;
}
