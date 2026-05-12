"use client";

import { useMemo } from "react";
import { cn, formatVetd } from "@/lib/utils";
import { getGuildThesis } from "@/config/guildThesis";
import { GuildCardHeader } from "./GuildCardHeader";
import { GuildMembersHero } from "./GuildMembersHero";
import { GuildTickerStrip, type TickerCell } from "./GuildTickerStrip";
import type {
  Guild,
  ExpertGuild,
  GuildApplicationSummary,
} from "@/types";

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
        "relative overflow-hidden rounded-[10px] border border-border bg-card",
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

function CardNameBlock({ name, thesis }: { name: string; thesis: string }) {
  return (
    <>
      <div className="w-8 h-px bg-primary mb-3.5" />
      <h3 className="font-display text-[22px] font-bold tracking-[-0.025em] leading-[1.05] mb-1.5 text-foreground">
        {name}.
      </h3>
      {thesis && (
        <p className="font-serif italic text-[12px] text-muted-foreground leading-[1.35] mb-4 max-w-[88%]">
          &ldquo;{thesis}&rdquo;
        </p>
      )}
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
    const thesis = getGuildThesis(guild.name, guild.description);
    const pending = guild.pendingProposals ?? 0;
    const tenureDays = calcTenureDays(guild.joinedAt, nowMs);
    const reviewedRecent = guild.closedProposals ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild — workspace`}>
        {pending > 0 && <PendingBanner count={pending} />}
        <div className={cn("relative z-10", pending > 0 ? "pt-9 px-5 pb-0" : "p-5 pb-0")}>
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            role={guild.expertRole}
            status="live"
          />
          <CardNameBlock name={guild.name} thesis={thesis} />
          <GuildMembersHero
            count={guild.memberCount ?? 0}
            topMembers={guild.topMembers}
            currentUserId={currentUserId}
            subCaption={
              <>
                <span className="text-foreground/80">{reviewedRecent}</span>{" "}
                reviewed
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
    const thesis = getGuildThesis(guild.name, guild.description);
    const open = guild.openPositions ?? 0;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} guild`}>
        <div className="relative z-10 p-5 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status={open > 0 ? { kind: "open", count: open } : "live"}
          />
          <CardNameBlock name={guild.name} thesis={thesis} />
          <GuildMembersHero
            count={guild.expertCount ?? guild.totalMembers ?? 0}
            topMembers={guild.topMembers}
            subCaption={<><span className="text-foreground/80">Top-rep</span> reviewers shown</>}
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
        <div className={cn("relative z-10", pending > 0 ? "pt-9 px-4 pb-0" : "p-4 pb-0")}>
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            role={guild.expertRole}
            status="live"
          />
          <div className="w-8 h-px bg-primary mb-3" />
          <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] mb-3 text-foreground">
            {guild.name}.
          </h3>
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
    const tenureDays = calcTenureDays(guild.joinedAt, nowMs);
    const joinedLabel = guild.joinedAt
      ? new Date(guild.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : null;
    return (
      <CardShell onClick={onClick} ariaLabel={`${guild.name} — guild position`}>
        <div className="relative z-10 p-4 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status="none"
          />
          <div className="w-8 h-px bg-primary mb-3" />
          <h3 className="font-display text-[18px] font-bold tracking-[-0.025em] leading-[1.05] mb-1 text-foreground">
            {guild.name}.
          </h3>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground mt-1 mb-3">
            <span className="text-primary capitalize">{guild.expertRole}</span>
            {joinedLabel && (
              <>
                <span className="text-border mx-1.5">·</span>
                <span>Member since {joinedLabel}</span>
              </>
            )}
            {tenureDays !== null && (
              <>
                <span className="text-border mx-1.5">·</span>
                <span>{tenureDays}d tenure</span>
              </>
            )}
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
    const thesis = getGuildThesis(name);
    return (
      <CardShell onClick={onClick} ariaLabel={`${name} guild — application ${statusLabel.toLowerCase()}`}>
        <div className="relative z-10 p-5 pb-0">
          <GuildCardHeader
            registrySlug={slug}
            registryNumber={idx}
            status={{ kind: "applicationStatus", label: statusLabel }}
          />
          <CardNameBlock name={name} thesis={thesis} />
        </div>
        <GuildTickerStrip cells={cells} />
      </CardShell>
    );
  }

  return null;
}
