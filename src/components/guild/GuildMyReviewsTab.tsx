"use client";

import { useMemo, useState } from "react";
import { GuildQueueRow } from "./GuildQueueRow";
import type {
  ExpertSubmittedReview,
  GuildApplication,
  GuildQueueItem,
  GuildWorkspaceStakePosition,
} from "@/types";

interface GuildMyReviewsTabProps {
  guildId: string;
  /** Expert ID of the viewer — used to build deep-link URLs. */
  expertId?: string | null;
  /** Pending assignments — drives "Active" / "Awaiting reveal" filters. */
  applications?: GuildApplication[];
  /** Reviews the viewer has already committed — drives "Past" / "All" filters. */
  submittedReviews?: ExpertSubmittedReview[];
  /**
   * Stake position (Total staked / In review / Available / At risk) — moved
   * here from the old Queue side panel per VET-101. Provided by the workspace
   * shell.
   */
  stakePosition?: GuildWorkspaceStakePosition;
  /** True while the parent is resolving expertId or fetching review data. */
  isLoading?: boolean;
}

// "Reveal open" filter removed per VET-101.
type FilterId = "active" | "awaiting" | "past" | "slashed" | "all";

const FILTER_OPTIONS: Array<{ id: FilterId; label: string }> = [
  { id: "active", label: "Active" },
  { id: "awaiting", label: "Awaiting reveal" },
  { id: "past", label: "Past 30 days" },
  { id: "slashed", label: "Slashed" },
  { id: "all", label: "All-time" },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Build the deep-link for a review row. Three surfaces with three URL shapes:
 * - expert_application → guild workspace, membership applications tab
 * - guild_application  → guild workspace, candidate applications drawer
 * - proposal           → standalone voting page
 *
 * `subjectId` is the id of the thing being reviewed (an expert application,
 * a candidate guild application, or a candidate proposal) — NOT the review
 * row's own id.
 */
function buildReviewHref(
  itemType: "expert_application" | "guild_application" | "proposal",
  subjectId: string,
  guildId: string,
): string {
  if (itemType === "guild_application") {
    return `/expert/voting?reviewAppId=${encodeURIComponent(subjectId)}&reviewType=candidate&guildId=${encodeURIComponent(guildId)}`;
  }
  if (itemType === "expert_application") {
    return `/expert/voting?reviewAppId=${encodeURIComponent(subjectId)}&reviewType=expert&guildId=${encodeURIComponent(guildId)}`;
  }
  return `/expert/voting/applications/${encodeURIComponent(subjectId)}`;
}

function mapApplicationToQueueItem(app: GuildApplication, guildId: string): GuildQueueItem {
  const isExpertApp = app.item_type === "expert_application";
  const isCandidateApp = app.item_type === "guild_application";
  const itemType = isExpertApp
    ? "expert_application"
    : isCandidateApp
      ? "guild_application"
      : "proposal";

  // Candidate reviews are single-shot (no commit/reveal). Expert apps still go
  // through the commit→reveal flow driven by `voting_phase`.
  const phase: GuildQueueItem["phase"] = isCandidateApp
    ? "review"
    : app.voting_phase === "reveal"
      ? "reveal"
      : app.voting_phase === "commit"
        ? "commit"
        : "vote";

  const bucket: GuildQueueItem["bucket"] = app.finalized
    ? "waiting"
    : phase === "reveal"
      ? "due_soon"
      : "waiting";

  const href = buildReviewHref(itemType, app.id, guildId);

  const actionLabel = isCandidateApp
    ? app.has_voted
      ? "View review"
      : "Review"
    : app.has_voted
      ? phase === "reveal"
        ? "Reveal vote"
        : "View commit"
      : "Start review";

  return {
    id: app.id,
    bucket,
    type: isExpertApp ? "expert" : isCandidateApp ? "candidate" : "candidate",
    phase,
    title: app.candidate_name || "Application",
    subjectName: app.guild_name,
    deadline: app.voting_deadline || null,
    commitsCompleted: app.vote_count ?? 0,
    commitsRequired: app.assigned_reviewer_count,
    stakeRequired: app.required_stake,
    stakeLocked: app.has_voted ? app.required_stake : undefined,
    actionLabel,
    actionPrimary: !app.has_voted,
    actionHref: href,
  };
}

function mapSubmittedToQueueItem(
  rev: ExpertSubmittedReview,
  guildId: string,
): GuildQueueItem {
  const isSlashed =
    rev.slashingTier != null &&
    rev.slashingTier !== "aligned" &&
    rev.slashingTier !== "neutral";
  const finalized = rev.applicationFinalized;
  const isSingleShot = rev.itemType === "guild_application";
  const isRevealOpen =
    !isSingleShot && rev.applicationVotingPhase === "reveal" && !finalized;

  const subjectId = rev.subjectId ?? rev.expertApplicationId;
  const href = buildReviewHref(rev.itemType, subjectId, guildId);

  // Per-surface lifecycle phrasing. Single-shot CGA reviews never sit in
  // commit/reveal — once submitted, the user is just waiting for the rest
  // of the panel.
  const subjectMeta = finalized
    ? rev.applicationOutcome
      ? `Outcome: ${rev.applicationOutcome}`
      : "Finalized"
    : isSingleShot
      ? "Awaiting panel"
      : isRevealOpen
        ? "Reveal open — action needed"
        : "Awaiting reveal";

  const phase: GuildQueueItem["phase"] = finalized
    ? "vote"
    : isSingleShot
      ? "review"
      : isRevealOpen
        ? "reveal"
        : "commit";

  const baseLabel = isSlashed
    ? `Slashed · ${rev.slashingTier}`
    : isRevealOpen
      ? "Reveal vote"
      : "View record";

  return {
    id: `submitted-${rev.itemType}-${rev.id}`,
    bucket: isRevealOpen ? "due_soon" : "waiting",
    type: rev.itemType === "expert_application" ? "expert" : "candidate",
    phase,
    title: rev.candidateName || "Submitted review",
    subjectName: rev.guildName ?? undefined,
    subjectMeta,
    deadline: rev.applicationFinalizedAt ?? rev.createdAt ?? null,
    commitsCompleted: undefined,
    commitsRequired: undefined,
    stakeRequired: undefined,
    stakeLocked: undefined,
    actionLabel: baseLabel,
    actionPrimary: isRevealOpen,
    actionHref: href,
    votesCast: undefined,
    totalVoters: undefined,
    supportPercent: rev.overallScore != null ? Math.round(rev.overallScore) : undefined,
  };
}

function matchesFilter(app: GuildApplication, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "active") return !app.finalized;
  // "Awaiting reveal" / "Reveal open" are commit-reveal lifecycle filters and
  // apply only to two-phase items (expert applications, proposal votes).
  // Candidate-membership reviews are single-shot.
  const hasCommitReveal =
    app.item_type === "expert_application" || app.item_type === "proposal";
  if (filter === "awaiting") {
    return hasCommitReveal && app.voting_phase === "commit" && !app.finalized;
  }
  if (filter === "past") {
    if (!app.finalized || !app.finalized_at) return false;
    const finalizedMs = new Date(app.finalized_at).getTime();
    return Date.now() - finalizedMs <= THIRTY_DAYS_MS;
  }
  if (filter === "slashed") {
    return (app.my_slashing_tier ?? null) != null;
  }
  return true;
}

function matchesSubmittedFilter(
  rev: ExpertSubmittedReview,
  filter: FilterId,
): boolean {
  if (filter === "all") return true;
  const finalized = rev.applicationFinalized;
  const isSingleShot = rev.itemType === "guild_application";
  const phase = rev.applicationVotingPhase;

  if (filter === "active") return !finalized;
  if (filter === "awaiting") {
    // Committed but the surrounding application is still pre-reveal. Single
    // shot reviews never sit in this bucket — they go straight from
    // submitted → finalized.
    return !isSingleShot && !finalized && phase !== "reveal";
  }
  if (filter === "past") {
    if (!finalized) return false;
    const finalizedAt = rev.applicationFinalizedAt ?? rev.createdAt;
    if (!finalizedAt) return false;
    const ms = new Date(finalizedAt).getTime();
    return Date.now() - ms <= THIRTY_DAYS_MS;
  }
  if (filter === "slashed") {
    return (
      rev.slashingTier != null &&
      rev.slashingTier !== "aligned" &&
      rev.slashingTier !== "neutral"
    );
  }
  return false;
}

/**
 * The "My Reviews" tab — surfaces the viewer's assigned guild applications
 * with filters for the commit/reveal lifecycle. Reads from
 * `guildApplicationsApi.getAssigned`, the same source the legacy dashboard's
 * Review Queue uses, so the counts here agree with the dashboard badges.
 */
export function GuildMyReviewsTab({
  guildId,
  expertId,
  applications,
  submittedReviews,
  stakePosition,
  isLoading = false,
}: GuildMyReviewsTabProps) {
  const [filter, setFilter] = useState<FilterId>("active");

  const items = useMemo(() => applications ?? [], [applications]);
  const submitted = useMemo(() => submittedReviews ?? [], [submittedReviews]);

  // Dedup: the Schelling-vote flow (`proposal`) does NOT drop the assignment
  // when the user commits — the same proposal can appear in both `items`
  // (still assigned) and `submitted` (we have a vote row). The submitted
  // view is more authoritative because it knows we've already committed and
  // can prompt for reveal, so we hide the assigned row whenever the same
  // subject has a submitted review. Expert/CGA flows already drop the
  // assignment on commit so this is a no-op for them, but the guard is cheap.
  const submittedSubjectKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of submitted) {
      const subjectId = r.subjectId ?? r.expertApplicationId;
      if (subjectId) set.add(`${r.itemType}:${subjectId}`);
    }
    return set;
  }, [submitted]);

  const dedupedItems = useMemo(
    () =>
      items.filter((a) => {
        const t = a.item_type;
        if (!t) return true;
        return !submittedSubjectKeys.has(`${t}:${a.id}`);
      }),
    [items, submittedSubjectKeys],
  );

  const filtered = useMemo(
    () => dedupedItems.filter((app) => matchesFilter(app, filter)),
    [dedupedItems, filter],
  );

  const submittedFiltered = useMemo(
    () => submitted.filter((rev) => matchesSubmittedFilter(rev, filter)),
    [submitted, filter],
  );

  const counts = useMemo(() => {
    // Each filter pill's count = (items matching) + (submitted matching).
    // After dedup these two sets are disjoint, so straight addition is safe
    // and we avoid the double-count that used to inflate "Awaiting reveal".
    const countFilter = (id: FilterId) =>
      dedupedItems.filter((a) => matchesFilter(a, id)).length +
      submitted.filter((r) => matchesSubmittedFilter(r, id)).length;
    return {
      active: countFilter("active"),
      awaiting: countFilter("awaiting"),
      past: countFilter("past"),
      slashed: countFilter("slashed"),
      all: dedupedItems.length + submitted.length,
    };
  }, [dedupedItems, submitted]);

  const queueRows = useMemo(() => {
    const pending = filtered.map((app) => mapApplicationToQueueItem(app, guildId));
    const done = submittedFiltered.map((rev) => mapSubmittedToQueueItem(rev, guildId));
    return [...pending, ...done];
  }, [filtered, submittedFiltered, guildId]);

  void expertId;
  const showLoading =
    isLoading && items.length === 0 && submitted.length === 0;

  return (
    <div>
      {/* Stake position — relocated from the old Queue side panel (VET-101). */}
      <MyReviewsStakePanel data={stakePosition} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          const countMap: Partial<Record<FilterId, number>> = {
            active: counts.active,
            awaiting: counts.awaiting,
            past: counts.past,
            slashed: counts.slashed,
            all: counts.all,
          };
          const count = countMap[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "border border-primary/35 bg-primary/10 text-primary"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
              {count != null && (
                <span className="ml-1.5 text-muted-foreground">· {count}</span>
              )}
            </button>
          );
        })}
      </div>

      {showLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-card/40"
            />
          ))}
        </div>
      )}

      {!showLoading && queueRows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          {filter === "active"
            ? "No active reviews — you're caught up."
            : "No reviews match this filter."}
        </div>
      )}

      <div className="space-y-2">
        {queueRows.map((item) => (
          <GuildQueueRow
            key={item.id}
            item={item}
            variant={item.phase === "reveal" ? "warm" : "default"}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * "Your stake position" card — moved here from the old Queue tab side panel
 * (VET-101). Shows Total staked / In review / Available / At risk for the
 * current guild.
 */
function MyReviewsStakePanel({
  data,
}: {
  data?: GuildWorkspaceStakePosition;
}) {
  const total = data?.totalStakedVetd ?? 0;
  const inReview = data?.inReviewVetd ?? 0;
  const available = data?.availableVetd ?? 0;
  const atRisk = data?.atRiskVetd ?? 0;
  const lockedPercent = data?.inReviewPercent ?? 0;

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Your stake position
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <StakeCell label="Total staked" value={total} caption="VETD" />
        <StakeCell
          label="In review"
          value={inReview}
          caption={`${Math.round(lockedPercent)}% locked`}
          tone="warning"
        />
        <StakeCell
          label="Available"
          value={available}
          caption="VETD"
          tone="positive"
        />
        <StakeCell label="At risk" value={atRisk} caption="slashable" />
      </div>
    </div>
  );
}

function StakeCell({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: number;
  caption: string;
  tone?: "default" | "warning" | "positive";
}) {
  const valueClass =
    tone === "warning"
      ? "text-warning"
      : tone === "positive"
        ? "text-positive"
        : "text-foreground";
  return (
    <div className="rounded-lg bg-muted px-3 py-2.5">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${valueClass}`}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div className="text-[10px] text-muted-foreground">{caption}</div>
    </div>
  );
}
