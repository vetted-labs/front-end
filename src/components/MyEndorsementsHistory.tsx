"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useMyActiveEndorsements, useEndorsementBidding } from "@/lib/hooks/useVettedContracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import {
  Award,
  TrendingUp,
  ChevronDown,
  Shield,
  ArrowUpDown,
  History,
  Coins,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_COLORS } from "@/config/colors";
import type { ActiveEndorsement } from "@/types";

type FilterStatus = "all" | "pending" | "reviewing" | "interviewed";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const COMPLETED_STATUSES = new Set(["hired", "not_hired", "refunded"]);

/** Map status to left-accent color classes */
const STATUS_ACCENT: Record<string, { bar: string; barBg: string }> = {
  pending: {
    bar: "bg-gradient-to-b from-primary to-primary/30",
    barBg: "bg-primary/10",
  },
  reviewing: {
    bar: "bg-gradient-to-b from-info-blue to-info-blue/30",
    barBg: "bg-info-blue/10",
  },
  interviewed: {
    bar: "bg-gradient-to-b from-info-blue to-info-blue/30",
    barBg: "bg-info-blue/10",
  },
  accepted: {
    bar: "bg-gradient-to-b from-positive to-positive/30",
    barBg: "bg-positive/10",
  },
  rejected: {
    bar: "bg-gradient-to-b from-negative to-negative/30",
    barBg: "bg-negative/10",
  },
  hired: {
    bar: "bg-gradient-to-b from-positive to-positive/30",
    barBg: "bg-positive/10",
  },
  not_hired: {
    bar: "bg-gradient-to-b from-negative to-negative/30",
    barBg: "bg-negative/10",
  },
  refunded: {
    bar: "bg-gradient-to-b from-info-blue to-info-blue/30",
    barBg: "bg-info-blue/10",
  },
};

const DEFAULT_ACCENT = {
  bar: "bg-gradient-to-b from-primary to-primary/30",
  barBg: "bg-primary/10",
};

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

function EndorsementRow({
  endorsement,
  maxStake,
  expandedId,
  setExpandedId,
  claimingId,
  onClaimRefund,
}: {
  endorsement: ActiveEndorsement;
  maxStake: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  claimingId: string | null;
  onClaimRefund: (endorsement: ActiveEndorsement) => void;
}) {
  const endorsementId =
    endorsement.endorsementId ||
    endorsement.applicationId ||
    endorsement.job?.id ||
    `${endorsement.candidate?.name || "candidate"}-${endorsement.createdAt || endorsement.endorsedAt}`;

  const isExpanded = expandedId === endorsementId;
  const toggle = () =>
    setExpandedId(isExpanded ? null : endorsementId);

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
      key={endorsementId}
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
            {(endorsement.candidate?.name || "?")
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
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
                <p className="text-sm font-semibold text-foreground">
                  {endorsement.guild?.name}
                </p>
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
          </div>
        </div>
      )}
    </div>
  );
}

export function MyEndorsementsHistory() {
  const { address, isConnected } = useAccount();
  const { endorsements, isLoading, error } = useMyActiveEndorsements();
  const { withdrawRefund } = useEndorsementBidding();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [search, setSearch] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);

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

  // Derived counts
  const totalStaked = useMemo(
    () =>
      endorsements.reduce(
        (sum, e) => sum + parseFloat(e.stakeAmount || "0"),
        0
      ),
    [endorsements]
  );

  const activeCount = useMemo(
    () =>
      endorsements.filter(
        (e) => !COMPLETED_STATUSES.has((e.application?.status || "pending").toLowerCase())
      ).length,
    [endorsements]
  );

  const completedCount = useMemo(
    () =>
      endorsements.filter(
        (e) => COMPLETED_STATUSES.has((e.application?.status || "pending").toLowerCase())
      ).length,
    [endorsements]
  );

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, reviewing: 0, interviewed: 0 };
    for (const e of endorsements) {
      const s = (
        e.application?.status || "pending"
      ).toLowerCase() as keyof typeof counts;
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [endorsements]);

  const filteredEndorsements = useMemo(() => {
    const base =
      filter === "all"
        ? endorsements
        : endorsements.filter(
            (e) =>
              (e.application?.status || "pending").toLowerCase() === filter
          );

    const searched = !search.trim()
      ? base
      : base.filter((e) => {
          const q = search.toLowerCase();
          return (
            e.job?.title?.toLowerCase().includes(q) ||
            e.candidate?.name?.toLowerCase().includes(q)
          );
        });

    return [...searched].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return (
            new Date(a.createdAt || a.endorsedAt).getTime() -
            new Date(b.createdAt || b.endorsedAt).getTime()
          );
        case "amount_desc":
          return parseFloat(b.stakeAmount || "0") - parseFloat(a.stakeAmount || "0");
        case "amount_asc":
          return parseFloat(a.stakeAmount || "0") - parseFloat(b.stakeAmount || "0");
        default: // date_desc
          return (
            new Date(b.createdAt || b.endorsedAt).getTime() -
            new Date(a.createdAt || a.endorsedAt).getTime()
          );
      }
    });
  }, [endorsements, filter, sort, search]);

  const maxStake = useMemo(
    () =>
      Math.max(
        ...endorsements.map((e) => parseFloat(e.stakeAmount || "0")),
        1
      ),
    [endorsements]
  );

  const activeEndorsements = useMemo(
    () => filteredEndorsements.filter((e) => !COMPLETED_STATUSES.has((e.application?.status || "pending").toLowerCase())),
    [filteredEndorsements]
  );

  const completedEndorsements = useMemo(
    () => filteredEndorsements.filter((e) => COMPLETED_STATUSES.has((e.application?.status || "pending").toLowerCase())),
    [filteredEndorsements]
  );

  if (!isConnected || !address) {
    return (
      <WalletRequiredState
        className="rounded-xl border border-border bg-card"
        message="Please connect your wallet to view your active endorsements"
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
        <p className="text-destructive">
          Error loading active endorsements: {error}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="h-16 bg-muted animate-pulse rounded-xl" />
        <div className="h-16 bg-muted animate-pulse rounded-xl" />
        <div className="h-16 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (endorsements.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No Active Endorsements"
        description="You haven't placed any active endorsements yet. Browse available applications to start endorsing candidates."
        className="rounded-xl border border-border bg-card p-16"
      />
    );
  }

  return (
    <div className="min-h-screen space-y-8">
      {/* ── Hero Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active */}
        <div className="group relative overflow-hidden rounded-[16px] border border-primary/15 bg-gradient-to-br from-card to-primary/[0.04] p-7 transition-all duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                Active Endorsements
              </p>
              <p className="text-4xl font-display font-extrabold text-primary leading-none tabular-nums">
                {activeCount}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-[14px]",
                "bg-primary/[0.08] border border-primary/15"
              )}
            >
              <Award className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden rounded-[16px] border border-border bg-gradient-to-br from-card to-muted/[0.04] p-7 transition-all duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-muted-foreground/30 to-transparent" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-muted/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                Completed
              </p>
              <p className="text-4xl font-display font-extrabold text-foreground leading-none tabular-nums">
                {completedCount}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-[14px]",
                "bg-muted/50 border border-border"
              )}
            >
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Total Staked */}
        <div className="group relative overflow-hidden rounded-[16px] border border-positive/15 bg-gradient-to-br from-card to-positive/[0.04] p-7 transition-all duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-positive to-transparent" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-positive/[0.06] blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                Total Staked
              </p>
              <p className="text-4xl font-display font-extrabold text-positive leading-none tabular-nums">
                {totalStaked.toFixed(0)}
                <span className="text-base font-semibold text-muted-foreground ml-1.5 font-sans">
                  VETD
                </span>
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-[14px]",
                "bg-positive/[0.08] border border-positive/15"
              )}
            >
              <TrendingUp className="h-5 w-5 text-positive" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div>
        <Input
          placeholder="Search by job title or candidate..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* ── Filter Tabs + Sort ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 rounded-[12px] border border-border bg-card p-1">
          {(
            [
              { key: "all", label: `All (${endorsements.length})` },
              { key: "pending", label: `Pending (${statusCounts.pending})` },
              {
                key: "reviewing",
                label: `Reviewing (${statusCounts.reviewing})`,
              },
              {
                key: "interviewed",
                label: `Interviewed (${statusCounts.interviewed})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-[9px] px-4 py-2 text-[13px] font-medium transition-all",
                filter === tab.key
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-[9px] border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Highest stake</option>
              <option value="amount_asc">Lowest stake</option>
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
            On-chain synced
          </div>
        </div>
      </div>

      {/* ── Endorsement List ── */}
      <div className="space-y-6">
        {/* Active section */}
        {activeEndorsements.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3 pl-1">
              Active Endorsements
            </h3>
            <div className="space-y-2.5">
              {activeEndorsements.map((endorsement) => (
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed section */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3 pl-1">
            Completed Endorsements
          </h3>
          {completedEndorsements.length > 0 ? (
            <div className="space-y-2.5">
              {completedEndorsements.map((endorsement) => (
                <EndorsementRow
                  key={
                    endorsement.endorsementId ||
                    endorsement.applicationId ||
                    endorsement.job?.id ||
                    `${endorsement.candidate?.name}-${endorsement.createdAt}-done`
                  }
                  endorsement={endorsement}
                  maxStake={maxStake}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  claimingId={claimingId}
                  onClaimRefund={handleClaimRefund}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-border bg-muted/20 p-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No completed endorsements yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Outcomes will appear here once an endorsed candidate is hired, rejected, or refunded.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tip Banner ── */}
      <div className="flex items-center justify-between gap-4 rounded-[16px] border border-primary/15 bg-gradient-to-r from-primary/[0.04] to-transparent p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary/[0.08] border border-primary/15 shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-foreground">
            <span className="font-bold text-primary">Endorsers</span>{" "}
            earn rewards when a candidate is hired. Stake on candidates you
            believe in to maximize your returns.
          </p>
        </div>
      </div>
    </div>
  );
}
