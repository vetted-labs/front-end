"use client";

import { useMemo, useState } from "react";
import { GuildQueueRow } from "./GuildQueueRow";
import type { GuildApplication, GuildQueueItem } from "@/types";

interface GuildMyReviewsTabProps {
  guildId: string;
  /** Expert ID of the viewer — used to build deep-link URLs. */
  expertId?: string | null;
  /**
   * The viewer's assigned applications scoped to this guild. Pulled from
   * `guildApplicationsApi.getAssigned(expertId, guildId)` by the workspace
   * container — this is the same data source the legacy dashboard's review
   * queue reads, so the badge counts agree across surfaces.
   */
  applications?: GuildApplication[];
}

type FilterId = "active" | "awaiting" | "open" | "past" | "slashed" | "all";

const FILTER_OPTIONS: Array<{ id: FilterId; label: string }> = [
  { id: "active", label: "Active" },
  { id: "awaiting", label: "Awaiting reveal" },
  { id: "open", label: "Reveal open" },
  { id: "past", label: "Past 30 days" },
  { id: "slashed", label: "Slashed" },
  { id: "all", label: "All-time" },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function mapApplicationToQueueItem(app: GuildApplication, guildId: string): GuildQueueItem {
  const phase: GuildQueueItem["phase"] =
    app.voting_phase === "reveal"
      ? "reveal"
      : app.voting_phase === "commit"
        ? "commit"
        : "vote";
  const bucket: GuildQueueItem["bucket"] = app.finalized
    ? "waiting"
    : phase === "reveal"
      ? "due_soon"
      : "waiting";

  const isExpertApp = app.item_type === "expert_application";
  const isCandidateApp = app.item_type === "guild_application";

  const href = (() => {
    const base = `/expert/guild/${encodeURIComponent(guildId)}`;
    if (isCandidateApp) {
      return `${base}?tab=membershipApplications&candidateApplicationId=${app.id}`;
    }
    if (isExpertApp) {
      return `${base}?tab=membershipApplications&applicationId=${app.id}`;
    }
    return `/expert/voting/applications/${encodeURIComponent(app.id)}`;
  })();

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
    actionLabel: app.has_voted
      ? phase === "reveal"
        ? "Reveal vote"
        : "View commit"
      : "Start review",
    actionPrimary: !app.has_voted,
    actionHref: href,
  };
}

function matchesFilter(app: GuildApplication, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "active") return !app.finalized;
  if (filter === "awaiting") return app.voting_phase === "commit" && !app.finalized;
  if (filter === "open") return app.voting_phase === "reveal" && !app.finalized;
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
}: GuildMyReviewsTabProps) {
  const [filter, setFilter] = useState<FilterId>("active");

  const items = useMemo(() => applications ?? [], [applications]);

  const filtered = useMemo(
    () => items.filter((app) => matchesFilter(app, filter)),
    [items, filter],
  );

  const counts = useMemo(() => {
    const active = items.filter((a) => !a.finalized).length;
    const awaiting = items.filter((a) => a.voting_phase === "commit" && !a.finalized).length;
    const open = items.filter((a) => a.voting_phase === "reveal" && !a.finalized).length;
    const past = items.filter((a) => matchesFilter(a, "past")).length;
    const slashed = items.filter((a) => matchesFilter(a, "slashed")).length;
    return { active, awaiting, open, past, slashed, all: items.length };
  }, [items]);

  const queueRows = useMemo(
    () => filtered.map((app) => mapApplicationToQueueItem(app, guildId)),
    [filtered, guildId],
  );

  const showWaitingForExpertId = !expertId && items.length === 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          const countMap: Partial<Record<FilterId, number>> = {
            active: counts.active,
            awaiting: counts.awaiting,
            open: counts.open,
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

      {showWaitingForExpertId && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          Loading your reviewer profile…
        </div>
      )}

      {!showWaitingForExpertId && queueRows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No reviews match this filter.
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
