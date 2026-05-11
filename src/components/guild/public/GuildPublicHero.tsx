"use client";

import { Share2, ChevronUp } from "lucide-react";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { getGuildIconName } from "@/lib/guildHelpers";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { CheckCircle2, Clock } from "lucide-react";

interface GuildPublicHeroProps {
  guildName: string;
  description: string;
  /** Stat strip values. */
  members: number;
  reviews: number;
  staked: string;
  consensusPct: number;
  openRoles: number;
  /** Optional delta strings for stats. */
  membersDelta?: string;
  reviewsDelta?: string;
  stakedDelta?: string;
  consensusDelta?: string;
  openRolesDelta?: string;
  /** Membership state */
  isMember: boolean;
  isPending: boolean;
  memberRole?: string;
  onJoin: () => void;
  onShare?: () => void;
  /** Slot for additional action (e.g. "Expert Dashboard" when member). */
  extraAction?: React.ReactNode;
}

interface StatCellProps {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  /** Hide right divider on the last cell. */
  last?: boolean;
}

function StatCell({ label, value, delta, positive = true, last = false }: StatCellProps) {
  return (
    <div
      className={`px-6 py-[18px] ${last ? "" : "border-r border-surface-border"} relative`}
    >
      <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="font-display text-[26px] leading-none text-foreground mb-1">
        {value}
      </div>
      {delta && (
        <div
          className={`text-[11px] flex items-center gap-1 ${
            positive ? "text-positive" : "text-muted-foreground"
          }`}
        >
          {positive && <ChevronUp className="w-3 h-3" />}
          {delta}
        </div>
      )}
    </div>
  );
}

export function GuildPublicHero({
  guildName,
  description,
  members,
  reviews,
  staked,
  consensusPct,
  openRoles,
  membersDelta,
  reviewsDelta,
  stakedDelta,
  consensusDelta,
  openRolesDelta,
  isMember,
  isPending,
  memberRole,
  onJoin,
  onShare,
  extraAction,
}: GuildPublicHeroProps) {
  const identity = getGuildIdentity(guildName);
  const guildIconName = getGuildIconName(guildName);
  // The hex value drives the per-guild signature gradient and accent strip.
  // Using inline style keeps the gradient unique without exploding the
  // tailwind safelist (eight guilds × multiple colour utilities).
  const gcHex = identity.hex;

  return (
    <section
      className="relative mb-7 rounded-[20px] border border-surface-border bg-surface-1 overflow-hidden"
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
        className="h-[140px] border-b border-surface-border relative"
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

      {/* Body */}
      <div className="px-7 pb-6 -mt-12 relative">
        <div className="flex items-end gap-6 mb-6">
          {/* Guild tile — uses the actual guild icon (Vetted icon system) */}
          <div
            className={`w-24 h-24 rounded-[20px] border flex items-center justify-center flex-shrink-0 ${identity.classes.bg} ${identity.classes.border}`}
            style={{
              boxShadow: `0 8px 24px ${gcHex}33, 0 0 0 4px hsl(var(--surface-1))`,
            }}
          >
            <VettedIcon
              name={guildIconName}
              className={`w-12 h-12 ${identity.classes.text}`}
            />
          </div>

          <div className="flex-1 pb-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em] mb-2.5 ${identity.classes.bg} ${identity.classes.text} border ${identity.classes.border}`}
            >
              {identity.shortName} Guild
            </span>
            <h1 className="font-display text-[32px] sm:text-[36px] leading-[1.1] tracking-[-0.01em] text-foreground mb-2">
              {guildName}
            </h1>
            <p className="text-[15px] leading-[1.5] text-muted-foreground max-w-2xl line-clamp-2">
              {description}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 pb-2 flex-shrink-0">
            <div className="flex gap-2.5 items-center">
              {onShare && (
                <button
                  onClick={onShare}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface-2 border border-surface-border text-foreground text-sm font-medium hover:bg-surface-3 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
              {!isMember && !isPending && (
                <button
                  onClick={onJoin}
                  className="inline-flex items-center gap-1.5 px-[18px] py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Join Guild
                </button>
              )}
              {isMember && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-positive/10 border border-positive/20 text-sm font-medium text-positive">
                  <CheckCircle2 className="w-4 h-4" />
                  Member
                  {memberRole && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="capitalize">{memberRole}</span>
                    </>
                  )}
                </div>
              )}
              {isPending && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/[0.08] border border-warning/20 text-sm font-medium text-warning">
                  <Clock className="w-4 h-4" />
                  Pending Review
                </div>
              )}
            </div>
            {extraAction}
          </div>
        </div>
      </div>

      {/* 5-stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-surface-border">
        <StatCell label="Members" value={members.toLocaleString()} delta={membersDelta} />
        <StatCell label="Reviews" value={reviews.toLocaleString()} delta={reviewsDelta} />
        <StatCell label="Staked" value={staked} delta={stakedDelta} positive={false} />
        <StatCell
          label="Consensus"
          value={`${consensusPct}%`}
          delta={consensusDelta}
        />
        <StatCell
          label="Open roles"
          value={openRoles}
          delta={openRolesDelta}
          positive={false}
          last
        />
      </div>
    </section>
  );
}
