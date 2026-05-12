"use client";

import { useMemo } from "react";
import { cn, formatVetd } from "@/lib/utils";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIconName } from "@/lib/guildHelpers";
import { getGuildIdentity } from "@/lib/guildIdentity";
import { GuildCardHeader } from "./GuildCardHeader";
import { GuildMembersHero } from "./GuildMembersHero";
import { GuildTickerStrip, type TickerCell } from "./GuildTickerStrip";
import type {
  Guild,
  ExpertGuild,
  GuildApplicationSummary,
} from "@/types";

/* ─── Guild icon block ───────────────────────────────────────────── */

function GuildIconBlock({
  name,
  size = "lg",
}: {
  name: string;
  size?: "md" | "lg" | "xl";
}) {
  const identity = getGuildIdentity(name);
  const sizing =
    size === "xl"
      ? { box: "w-16 h-16", icon: "w-8 h-8", rounded: "rounded-2xl" }
      : size === "lg"
      ? { box: "w-14 h-14", icon: "w-7 h-7", rounded: "rounded-2xl" }
      : { box: "w-11 h-11", icon: "w-[22px] h-[22px]", rounded: "rounded-xl" };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0 border",
        sizing.box,
        sizing.rounded,
        identity.classes.bg,
        identity.classes.border,
        identity.classes.text,
      )}
    >
      <VettedIcon name={getGuildIconName(name)} className={sizing.icon} />
    </span>
  );
}

/* ─── Variant types ──────────────────────────────────────────────── */

type WorkspaceProps = {
  variant: "workspace";
  guild: ExpertGuild;
  /** Index of this guild within the user's "My Guilds" list (1-based, for the registry number + watermark). */
  catalogueIndex: number;
  currentUserId?: string;
  stakedAmount?: string;
  onClick?: () => void;
};

type MarketplaceProps = {
  variant: "marketplace";
  guild: Guild;
  catalogueIndex: number;
  onClick?: () => void;
};

type WidgetProps = {
  variant: "widget";
  guild: ExpertGuild;
  catalogueIndex: number;
  currentUserId?: string;
  stakedAmount?: string;
  onClick?: () => void;
};

type ProfileProps = {
  variant: "profile";
  guild: ExpertGuild;
  catalogueIndex: number;
  onClick?: () => void;
};

type CandidateProps = {
  variant: "candidate";
  application: GuildApplicationSummary;
  catalogueIndex: number;
  statusLabel: string;
  cells: [TickerCell, TickerCell, TickerCell];
  onClick?: () => void;
};

export type GuildCardProps =
  | WorkspaceProps
  | MarketplaceProps
  | WidgetProps
  | ProfileProps
  | CandidateProps;

/* ─── Shell ──────────────────────────────────────────────────────── */

function CardShell({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[10px] border border-border bg-card h-full",
        "transition-colors duration-200 hover:border-border/80",
        onClick && "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <div aria-hidden className="absolute inset-0 ambient-grid" />
      {children}
    </article>
  );
}

function PendingBanner({ count }: { count: number }) {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-warning/[0.07] border-b border-warning/20 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-warning">
      <span className="font-bold">&gt;</span>
      <span>{count} pending review{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

function CardNameBlock({ name }: { name: string }) {
  return (
    <>
      <div className="w-6 h-[2px] bg-primary mb-4" />
      <h3 className="font-display text-[22px] font-bold tracking-[-0.025em] leading-[1.05] text-foreground">
        {name}
      </h3>
    </>
  );
}

/* ─── Slug helper ────────────────────────────────────────────────── */

function toRegistrySlug(name: string): string {
  return name.split(/[,&]/)[0].trim().toUpperCase();
}

/* ─── Tenure helper ──────────────────────────────────────────────── */

function calcTenureDays(joinedAt: string | undefined, nowMs: number): number | null {
  if (!joinedAt) return null;
  return Math.max(0, Math.floor((nowMs - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)));
}

/* ─── Main composer ──────────────────────────────────────────────── */

export function GuildCard(props: GuildCardProps) {
  // eslint-disable-next-line react-hooks/purity -- stable snapshot of current time used only for tenure math, memoized once per mount
  const nowMs = useMemo(() => Date.now(), []);
  const idx = String(props.catalogueIndex).padStart(2, "0");

  if (props.variant === "workspace") {
    const { guild, currentUserId, stakedAmount, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const pending = guild.pendingProposals ?? 0;
    const tenureDays = calcTenureDays(guild.joinedAt, nowMs);
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild — workspace`}>
        {pending > 0 && <PendingBanner count={pending} />}
        <div className={cn("relative z-10 flex-1 flex flex-col gap-4", pending > 0 ? "pt-9 px-5 pb-0" : "p-5 pb-0")}>
          <div>
            <GuildCardHeader
              registrySlug={slug}
              registryNumber={idx}
              role={guild.expertRole}
              status="none"
            />
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <CardNameBlock name={guild.name} />
              </div>
              <GuildIconBlock name={guild.name} size="lg" />
            </div>
          </div>
          <GuildMembersHero
            count={guild.memberCount ?? 0}
            topMembers={guild.topMembers}
            currentUserId={currentUserId}
            subCaption={
              <>
                <span className="text-foreground/80">Your rep:</span>{" "}
                <span className="text-foreground/80">{guild.reputation ?? 0}</span>
                {tenureDays !== null && (
                  <>
                    <span className="text-border mx-1.5">·</span>
                    <span className="text-foreground/80">{tenureDays}d</span>{" "}
                    tenure
                  </>
                )}
              </>
            }
          />
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: stakedAmount
                ? parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })
                : "0",
              unit: "VETD",
              label: "Staked",
              tone: "accent",
            },
            {
              value: formatVetd(guild.totalEarnings ?? 0),
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Reputation",
            },
          ]}
        />
      </CardShell>
    );
  }

  if (props.variant === "marketplace") {
    const { guild, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const open = guild.openPositions ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild`}>
        <div className="relative z-10 flex-1 flex flex-col gap-4 p-5 pb-0">
          <div>
            <GuildCardHeader
              registrySlug={slug}
              registryNumber={idx}
              status={open > 0 ? { kind: "open", count: open } : "none"}
            />
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <CardNameBlock name={guild.name} />
              </div>
              <GuildIconBlock name={guild.name} size="xl" />
            </div>
          </div>
          <GuildMembersHero
            count={guild.expertCount ?? guild.totalMembers ?? 0}
            topMembers={guild.topMembers}
          />
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: String(guild.expertCount ?? 0),
              label: "Experts",
            },
            {
              value: String(guild.totalProposalsReviewed ?? 0),
              label: "Reviewed",
            },
            {
              value: String(open),
              label: "Open Roles",
              tone: "accent",
            },
          ]}
        />
      </CardShell>
    );
  }

  if (props.variant === "widget") {
    const { guild, currentUserId, stakedAmount, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    const pending = guild.pendingProposals ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild — widget`}>
        {pending > 0 && <PendingBanner count={pending} />}
        <div className={cn("relative z-10 flex-1 flex flex-col gap-3", pending > 0 ? "pt-9 px-4 pb-0" : "p-4 pb-0")}>
          <div>
            <GuildCardHeader
              registrySlug={slug}
              registryNumber={idx}
              role={guild.expertRole}
              status="none"
            />
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="w-6 h-[2px] bg-primary mb-3" />
                <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] text-foreground">
                  {guild.name}
                </h3>
              </div>
              <GuildIconBlock name={guild.name} size="md" />
            </div>
          </div>
          <GuildMembersHero
            compact
            count={guild.memberCount ?? 0}
            topMembers={guild.topMembers}
            currentUserId={currentUserId}
          />
        </div>
        <GuildTickerStrip
          compact
          cells={[
            {
              value: stakedAmount
                ? parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "0",
              unit: "V",
              label: "Staked",
              tone: "accent",
            },
            {
              value: formatVetd(guild.totalEarnings ?? 0),
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Rep",
            },
          ]}
        />
      </CardShell>
    );
  }

  if (props.variant === "profile") {
    const { guild, onClick } = props;
    const slug = toRegistrySlug(guild.name);
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} — guild position`}>
        <div className="relative z-10 flex-1 flex flex-col p-4 pb-0">
          <div>
            <GuildCardHeader
              registrySlug={slug}
              registryNumber={idx}
              status="none"
            />
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="w-6 h-[2px] bg-primary mb-3" />
                <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] text-foreground">
                  {guild.name}
                </h3>
              </div>
              <GuildIconBlock name={guild.name} size="lg" />
            </div>
          </div>
        </div>
        <GuildTickerStrip
          cells={[
            {
              value: "—",
              unit: "VETD",
              label: "Staked",
              tone: "accent",
            },
            {
              value: formatVetd(guild.totalEarnings ?? 0),
              label: "Earned",
              tone: "positive",
            },
            {
              value: String(guild.reputation ?? 0),
              label: "Reputation",
            },
          ]}
        />
      </CardShell>
    );
  }

  if (props.variant === "candidate") {
    const { application, statusLabel, cells, onClick } = props;
    const name = application.guildName ?? application.guild?.name ?? "Guild";
    const slug = toRegistrySlug(name);
    return (
      <CardShell onClick={onClick} ariaLabel={`${name} guild — application ${statusLabel.toLowerCase()}`}>
        <div className="relative z-10 flex-1 flex flex-col p-5 pb-0">
          <div>
            <GuildCardHeader
              registrySlug={slug}
              registryNumber={idx}
              status={{ kind: "applicationStatus", label: statusLabel }}
            />
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <CardNameBlock name={name} />
              </div>
              <GuildIconBlock name={name} size="lg" />
            </div>
          </div>
        </div>
        <GuildTickerStrip cells={cells} />
      </CardShell>
    );
  }

  return null;
}
