"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/lib/hooks/useFetch";
import { guildsApi } from "@/lib/api";
import { GuildQueueRow } from "./GuildQueueRow";
import type { GuildQueueItem } from "@/types";

interface GuildMyReviewsTabProps {
  guildId: string;
  walletAddress?: string;
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

function matchesFilter(item: GuildQueueItem, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "active") return item.bucket !== "unclaimed";
  if (filter === "open") return item.phase === "reveal";
  if (filter === "awaiting") return item.phase === "commit";
  if (filter === "past" || filter === "slashed") return false;
  return true;
}

/**
 * The "My Reviews" tab — filters across the same queue payload, scoped to
 * items the viewer has already engaged with. Falls back to the unfiltered
 * queue when the backend doesn't return the historical buckets yet.
 */
export function GuildMyReviewsTab({ guildId, walletAddress }: GuildMyReviewsTabProps) {
  const [filter, setFilter] = useState<FilterId>("active");
  const { data, isLoading, error } = useFetch(
    () => guildsApi.getMemberQueue(guildId, walletAddress),
    {
      onError: () => {},
    },
  );

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((i) => matchesFilter(i, filter));
  }, [data, filter]);

  const counts = useMemo(() => {
    const items = data?.items ?? [];
    const active = items.filter((i) => i.bucket !== "unclaimed").length;
    const awaiting = items.filter((i) => i.phase === "commit").length;
    const open = items.filter((i) => i.phase === "reveal").length;
    return { active, awaiting, open, all: items.length };
  }, [data]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          const countMap: Partial<Record<FilterId, number>> = {
            active: counts.active,
            awaiting: counts.awaiting,
            open: counts.open,
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

      {error && !data && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load your review history.
        </div>
      )}

      {isLoading && !data && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {filtered.length === 0 && !isLoading && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No reviews match this filter.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <GuildQueueRow
            key={item.id}
            item={item}
            variant={item.bucket === "due_soon" ? "warm" : "default"}
          />
        ))}
      </div>
    </div>
  );
}
