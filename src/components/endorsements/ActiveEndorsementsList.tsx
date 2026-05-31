"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ChevronDown, Coins } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { STATUS_COLORS } from "@/config/colors";
import { GuildBadge } from "@/components/ui/guild";
import {
  TOUR_TARGETS,
  dataTourTarget,
} from "@/components/expert/onboarding/tourTargets";
import { useEndorsementBidding } from "@/lib/hooks/useVettedContracts";
import { useFetch } from "@/lib/hooks/useFetch";
import { endorsementAccountabilityApi, extractApiError } from "@/lib/api";
import type {
  ActiveEndorsement,
  EndorsementApplication,
  EndorsementOutcomeRow,
} from "@/types";

/**
 * Filter tabs (VET-99). The first four mirror the application status; the last
 * two are outcome-driven and read from the `my-outcomes` endpoint via the
 * Decision 7 mapping (Hired → hireOutcome=hired, 90 days retained →
 * retentionStatus=confirmed).
 */
type OutcomeFilter = "hired" | "retained";
type FilterStatus = "all" | "pending" | "reviewing" | "interviewed" | OutcomeFilter;

const COMPLETED_STATUSES = new Set(["hired", "not_hired", "refunded"]);

/** Map status to left-accent color classes */
const STATUS_ACCENT: Record<string, { bar: string }> = {
  pending: { bar: "bg-gradient-to-b from-primary to-primary/30" },
  reviewing: { bar: "bg-gradient-to-b from-info-blue to-info-blue/30" },
  interviewed: { bar: "bg-gradient-to-b from-info-blue to-info-blue/30" },
  accepted: { bar: "bg-gradient-to-b from-positive to-positive/30" },
  rejected: { bar: "bg-gradient-to-b from-negative to-negative/30" },
  hired: { bar: "bg-gradient-to-b from-positive to-positive/30" },
  not_hired: { bar: "bg-gradient-to-b from-negative to-negative/30" },
  refunded: { bar: "bg-gradient-to-b from-info-blue to-info-blue/30" },
};

const DEFAULT_ACCENT = { bar: "bg-gradient-to-b from-primary to-primary/30" };

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Outcome badge shown for completed endorsements */
function OutcomeBadge({ statusKey }: { statusKey: string }) {
  if (statusKey === "hired") {
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", STATUS_COLORS.positive.badge)}>
        Hired
      </span>
    );
  }
  if (statusKey === "not_hired") {
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", STATUS_COLORS.negative.badge)}>
        Not Hired — 10% Slashed
      </span>
    );
  }
  if (statusKey === "refunded") {
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", STATUS_COLORS.info.badge)}>
        Refunded
      </span>
    );
  }
  return null;
}

/**
 * Rich full-width endorsement row (relocated from MyEndorsementsHistory): accent
 * bar, job title, company + location, candidate chip, VETD amount + progress
 * bar, status pill / outcome badge, claim affordance, and a chevron expander.
 */
function EndorsementRow({
  endorsement,
  maxStake,
  expandedId,
  setExpandedId,
  claimingId,
  onClaimRefund,
  onSelect,
}: {
  endorsement: ActiveEndorsement;
  maxStake: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  claimingId: string | null;
  onClaimRefund: (endorsement: ActiveEndorsement) => void;
  onSelect?: (endorsement: ActiveEndorsement) => void;
}) {
  const endorsementId =
    endorsement.endorsementId ||
    endorsement.applicationId ||
    endorsement.job?.id ||
    `${endorsement.candidate?.name || "candidate"}-${endorsement.createdAt || endorsement.endorsedAt}`;

  const isExpanded = expandedId === endorsementId;
  const toggle = () => setExpandedId(isExpanded ? null : endorsementId);

  const statusKey = (endorsement.application?.status || "pending").toLowerCase();
  const statusConfig =
    APPLICATION_STATUS_CONFIG[statusKey] || APPLICATION_STATUS_CONFIG.pending;
  const accent = STATUS_ACCENT[statusKey] || DEFAULT_ACCENT;
  const isCompleted = COMPLETED_STATUSES.has(statusKey);

  // A refund is claimable when the bidding pool is closed (completed outcome),
  // the expert was not selected (rank absent or > 3), and the status is not
  // already "refunded" (which means it was already claimed).
  const rank = endorsement.blockchainData?.rank;
  const isRefundable =
    isCompleted &&
    statusKey !== "refunded" &&
    (rank === undefined || rank === null || rank > 3);

  const stakeNum = parseFloat(endorsement.stakeAmount || "0");
  const stakePct = (stakeNum / maxStake) * 100;

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-card overflow-hidden transition-all duration-200",
        "hover:border-primary/25 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
        isExpanded && "border-primary/20"
      )}
    >
      {/* Collapsed Row */}
      <div
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        className="group flex items-center gap-5 p-5 cursor-pointer"
      >
        {/* Left accent bar */}
        <div className={cn("w-1 h-12 rounded-full shrink-0", accent.bar)} />

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
            {endorsement.job?.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="truncate">{endorsement.job?.companyName}</span>
            <span className="text-border">·</span>
            <span className="truncate">{endorsement.job?.location || "Remote"}</span>
          </div>
        </div>

        {/* Candidate chip */}
        <div className="hidden sm:flex items-center gap-2.5 min-w-0 max-w-[200px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted border border-border text-xs font-bold text-foreground">
            {getInitials(endorsement.candidate?.name || "?")}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground truncate block">
              {endorsement.candidate?.name}
            </span>
            <span className="text-[11px] text-muted-foreground">Candidate</span>
          </div>
        </div>

        {/* Stake with bar */}
        <div className="hidden md:block text-right min-w-[130px]">
          <p className="text-[15px] font-bold font-mono text-primary tabular-nums">
            {stakeNum.toFixed(2)}
            <span className="text-[11px] font-semibold text-primary/50 ml-1 font-sans">VETD</span>
          </p>
          <div className="h-[3px] bg-primary/[0.08] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/30 transition-all duration-500"
              style={{ width: `${stakePct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Outcome badge (completed) or status pill (active) */}
          {isCompleted ? (
            <OutcomeBadge statusKey={statusKey} />
          ) : (
            <Badge
              className={cn(
                "text-xs gap-1.5 rounded-[8px] px-3 py-1",
                statusConfig.className
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  statusKey === "pending"
                    ? "bg-primary"
                    : statusKey === "reviewing" || statusKey === "interviewed"
                      ? "bg-info-blue"
                      : statusKey === "accepted"
                        ? "bg-positive"
                        : "bg-neutral"
                )}
              />
              {statusConfig.label}
            </Badge>
          )}

          {/* Claim Refund button for non-selected endorsers */}
          {isRefundable && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onClaimRefund(endorsement);
              }}
              disabled={claimingId === endorsementId}
              className="h-8 text-xs"
            >
              <Coins className="w-3.5 h-3.5 mr-1" />
              {claimingId === endorsementId ? "Claiming..." : "Claim Refund"}
            </Button>
          )}

          {/* Chevron */}
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-muted/30 transition-all duration-200",
              "group-hover:bg-muted group-hover:border-border",
              isExpanded && "rotate-180"
            )}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Expanded Details ── */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="border-t border-border pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-[12px] border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Candidate
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {endorsement.candidate?.name}
                </p>
                {endorsement.candidate?.headline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {endorsement.candidate.headline}
                  </p>
                )}
              </div>
              <div className="rounded-[12px] border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Guild
                </p>
                <GuildBadge guild={endorsement.guild?.name} size="xs" />
              </div>
              <div className="rounded-[12px] border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Endorsed
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {new Date(
                    endorsement.createdAt || endorsement.endorsedAt
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="rounded-[12px] border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  {endorsement.blockchainData?.bidAmount ? "On-Chain Bid" : "Stake"}
                </p>
                <p className="text-sm font-bold font-mono text-primary tabular-nums">
                  {parseFloat(
                    endorsement.blockchainData?.bidAmount ||
                      endorsement.stakeAmount ||
                      "0"
                  ).toFixed(2)}{" "}
                  <span className="text-xs font-medium text-muted-foreground font-sans">
                    VETD
                  </span>
                </p>
              </div>
            </div>

            {endorsement.application?.coverLetter && (
              <div className="mt-4 rounded-[12px] border border-border bg-muted/30 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Candidate Summary
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {endorsement.application.coverLetter}
                </p>
              </div>
            )}

            {endorsement.notes && (
              <div className="mt-4 rounded-[12px] border border-border bg-muted/30 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Your Notes
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {endorsement.notes}
                </p>
              </div>
            )}

            {onSelect && (
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(endorsement);
                  }}
                  className="h-8 text-xs"
                >
                  View endorsement
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Outcome row (Hired / 90 days retained) rendered from the my-outcomes endpoint. */
function OutcomeRow({
  row,
  maxStake,
}: {
  row: EndorsementOutcomeRow;
  maxStake: number;
}) {
  const isRetained = row.retention_status === "confirmed";
  const stakeNum = parseFloat(row.stake_amount || "0");
  const stakePct = (stakeNum / maxStake) * 100;

  return (
    <div className="rounded-[16px] border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-5 p-5">
        <div
          className={cn(
            "w-1 h-12 rounded-full shrink-0",
            isRetained
              ? "bg-gradient-to-b from-positive to-positive/30"
              : "bg-gradient-to-b from-primary to-primary/30"
          )}
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-foreground leading-tight truncate">
            {row.job_title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="truncate">{row.company_name}</span>
            <span className="text-border">·</span>
            <span className="truncate">{row.location || "Remote"}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 min-w-0 max-w-[200px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted border border-border text-xs font-bold text-foreground">
            {getInitials(row.candidate_name || "?")}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground truncate block">
              {row.candidate_name}
            </span>
            <span className="text-[11px] text-muted-foreground">Candidate</span>
          </div>
        </div>

        <div className="hidden md:block text-right min-w-[130px]">
          <p className="text-[15px] font-bold font-mono text-primary tabular-nums">
            {stakeNum.toFixed(2)}
            <span className="text-[11px] font-semibold text-primary/50 ml-1 font-sans">VETD</span>
          </p>
          <div className="h-[3px] bg-primary/[0.08] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/30"
              style={{ width: `${stakePct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold border",
              isRetained ? STATUS_COLORS.positive.badge : STATUS_COLORS.info.badge
            )}
          >
            {isRetained ? "90 Days Retained" : "Hired"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ActiveEndorsementsListProps {
  /** Endorsements scoped to the active guild (or all guilds). Drives the rich rows + status tabs. */
  endorsements: ActiveEndorsement[];
  /** Wallet of the authenticated expert — required for the my-outcomes endpoint. */
  walletAddress?: string;
  /** When set, the Hired/90-day tabs scope outcomes to this guild. */
  guildId?: string;
  /** Friendly scope name used in empty copy. */
  guildName: string;
  /** Opens the existing endorsement in the shared modal. */
  onSelectEndorsement?: (application: EndorsementApplication) => void;
}

/**
 * "Active Endorsements" area on the main Endorsements page (VET-99, Decision 5).
 * Renders the rich endorsement rows with a filter/tab bar. The first four tabs
 * filter the on-chain-synced endorsements by application status; the Hired and
 * "90 days retained" tabs read outcome rows from the my-outcomes endpoint
 * (Decision 7 mapping).
 */
export function ActiveEndorsementsList({
  endorsements,
  walletAddress,
  guildId,
  guildName,
  onSelectEndorsement,
}: ActiveEndorsementsListProps) {
  const { withdrawRefund } = useEndorsementBidding();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const isOutcomeFilter = filter === "hired" || filter === "retained";

  // Outcome rows for the Hired / 90-day tabs. We always fetch both buckets so
  // their tab counts stay live, mirroring the existing status tabs.
  const { data: hiredOutcomes } = useFetch(
    () =>
      endorsementAccountabilityApi.getMyOutcomes(walletAddress!, {
        hireOutcome: "hired",
        guildId,
        limit: 100,
      }),
    {
      skip: !walletAddress,
      onError: (err) =>
        toast.error(extractApiError(err, "Couldn't load hire outcomes")),
    },
  );

  const { data: retainedOutcomes } = useFetch(
    () =>
      endorsementAccountabilityApi.getMyOutcomes(walletAddress!, {
        retentionStatus: "confirmed",
        guildId,
        limit: 100,
      }),
    {
      skip: !walletAddress,
      onError: (err) =>
        toast.error(extractApiError(err, "Couldn't load retained outcomes")),
    },
  );

  const hiredRows = useMemo(() => hiredOutcomes?.data ?? [], [hiredOutcomes]);
  const retainedRows = useMemo(
    () => retainedOutcomes?.data ?? [],
    [retainedOutcomes],
  );

  const handleClaimRefund = async (endorsement: ActiveEndorsement) => {
    const id =
      endorsement.endorsementId ||
      endorsement.applicationId ||
      endorsement.job?.id ||
      `${endorsement.candidate?.name || "candidate"}-${endorsement.createdAt || endorsement.endorsedAt}`;
    setClaimingId(id);
    try {
      const txHash = await withdrawRefund();
      toast.success(`Refund claimed! Transaction: ${txHash.slice(0, 10)}…`);
    } catch (err) {
      logger.error("Refund claim failed", err);
      toast.error("Failed to claim refund. Please try again or use the contract directly.");
    } finally {
      setClaimingId(null);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, reviewing: 0, interviewed: 0 };
    for (const e of endorsements) {
      const s = (e.application?.status || "pending").toLowerCase() as keyof typeof counts;
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [endorsements]);

  const filteredEndorsements = useMemo(() => {
    if (filter === "all") return endorsements;
    if (isOutcomeFilter) return [];
    return endorsements.filter(
      (e) => (e.application?.status || "pending").toLowerCase() === filter,
    );
  }, [endorsements, filter, isOutcomeFilter]);

  const maxStake = useMemo(() => {
    const fromEndorsements = endorsements.map((e) => parseFloat(e.stakeAmount || "0"));
    const fromOutcomes = [...hiredRows, ...retainedRows].map((r) =>
      parseFloat(r.stake_amount || "0"),
    );
    return Math.max(...fromEndorsements, ...fromOutcomes, 1);
  }, [endorsements, hiredRows, retainedRows]);

  const tabs = [
    { key: "all" as const, label: `All (${endorsements.length})` },
    { key: "pending" as const, label: `Pending (${statusCounts.pending})` },
    { key: "reviewing" as const, label: `Reviewing (${statusCounts.reviewing})` },
    { key: "interviewed" as const, label: `Interviewed (${statusCounts.interviewed})` },
    { key: "hired" as const, label: `Hired (${hiredRows.length})` },
    { key: "retained" as const, label: `90 days retained (${retainedRows.length})` },
  ];

  const outcomeRows = filter === "hired" ? hiredRows : retainedRows;

  return (
    <div className="min-w-0" {...dataTourTarget(TOUR_TARGETS.endorsementActiveList)}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-display font-bold text-xl tracking-tight flex items-center gap-3">
          Active Endorsements
          {endorsements.length > 0 && (
            <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {endorsements.length}
            </span>
          )}
        </h2>
      </div>

      {/* Filter Tabs — All / Pending / Reviewing / Interviewed / Hired / 90 days retained */}
      <div className="flex gap-1 rounded-[12px] border border-border bg-card p-1 mb-5 w-max max-w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-[9px] px-4 py-2 text-[13px] font-medium transition-all whitespace-nowrap",
              filter === tab.key
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isOutcomeFilter ? (
        outcomeRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <VettedIcon name="endorsement" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">
              {filter === "hired" ? "No hired outcomes yet" : "No retained outcomes yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === "hired"
                ? "Endorsed candidates who get hired will appear here."
                : "Endorsed hires who clear the 90-day retention window will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {outcomeRows.map((row) => (
              <OutcomeRow key={row.endorsement_id} row={row} maxStake={maxStake} />
            ))}
          </div>
        )
      ) : endorsements.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <VettedIcon name="endorsement" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-2">
            You haven&apos;t endorsed any candidates in {guildName} yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            Browse applications below and endorse candidates you believe will succeed
          </p>
        </div>
      ) : filteredEndorsements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No endorsements match this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEndorsements.map((endorsement) => (
            <EndorsementRow
              key={
                endorsement.endorsementId ||
                endorsement.applicationId ||
                endorsement.job?.id ||
                `${endorsement.candidate?.name}-${endorsement.createdAt}`
              }
              endorsement={endorsement}
              maxStake={maxStake}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              claimingId={claimingId}
              onClaimRefund={handleClaimRefund}
              onSelect={onSelectEndorsement ? handleSelect(onSelectEndorsement) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Maps a rich endorsement into the EndorsementApplication shape the shared
 * modal expects, then forwards it to the page handler. Kept outside the row so
 * the row stays presentational.
 */
function handleSelect(
  onSelectEndorsement: (application: EndorsementApplication) => void,
) {
  return (endorsement: ActiveEndorsement) => {
    const application: EndorsementApplication = {
      application_id: endorsement.application?.id ?? endorsement.applicationId ?? "",
      candidate_id: endorsement.candidate?.id ?? "",
      job_id: endorsement.job?.id ?? "",
      company_id: endorsement.job?.companyId,
      candidate_name: endorsement.candidate?.name ?? "",
      candidate_headline: endorsement.candidate?.headline ?? "",
      candidate_profile_picture_url: endorsement.candidate?.profilePicture,
      candidate_bio: endorsement.candidate?.bio ?? "",
      candidate_wallet: endorsement.candidate?.walletAddress ?? "",
      job_title: endorsement.job?.title ?? "",
      job_description: endorsement.job?.description,
      company_name: endorsement.job?.companyName ?? "",
      company_logo: endorsement.job?.companyLogo,
      location: endorsement.job?.location ?? "",
      job_type: endorsement.job?.jobType ?? "",
      salary_min: endorsement.job?.salaryMin ?? 0,
      salary_max: endorsement.job?.salaryMax ?? 0,
      salary_currency: endorsement.job?.salaryCurrency,
      status: endorsement.application?.status,
      applied_at: endorsement.application?.appliedAt ?? endorsement.endorsedAt,
      cover_letter: endorsement.application?.coverLetter,
      screening_answers: endorsement.application?.screeningAnswers,
      guild_score: endorsement.guildScore ?? 0,
      current_bid: endorsement.stakeAmount,
      rank: endorsement.blockchainData?.rank ?? 0,
      requirements: endorsement.job?.requirements ?? [],
      job_skills: endorsement.job?.skills ?? [],
      experience_level: endorsement.candidate?.experienceLevel,
      linkedin: endorsement.candidate?.linkedin,
      github: endorsement.candidate?.github,
      resume_url: endorsement.candidate?.resumeUrl,
    };
    onSelectEndorsement(application);
  };
}
