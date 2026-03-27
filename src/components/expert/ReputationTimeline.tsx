import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { ReputationTimelineEntry, ReputationTierConfig, PaginationInfo } from "@/types";

const tierConfig: Record<string, ReputationTierConfig> = {
  aligned: {
    label: "Aligned",
    color: STATUS_COLORS.positive.text,
    bg: STATUS_COLORS.positive.bgSubtle,
    border: STATUS_COLORS.positive.border,
  },
  mild_deviation: {
    label: "Mild Deviation",
    color: STATUS_COLORS.warning.text,
    bg: STATUS_COLORS.warning.bgSubtle,
    border: STATUS_COLORS.warning.border,
  },
  moderate_deviation: {
    label: "Moderate Deviation",
    color: STATUS_COLORS.pending.text,
    bg: STATUS_COLORS.pending.bgSubtle,
    border: STATUS_COLORS.pending.border,
  },
  severe_deviation: {
    label: "Severe Deviation",
    color: STATUS_COLORS.negative.text,
    bg: STATUS_COLORS.negative.bgSubtle,
    border: STATUS_COLORS.negative.border,
  },
  vote_with_majority: {
    label: "Majority Vote",
    color: STATUS_COLORS.info.text,
    bg: STATUS_COLORS.info.bgSubtle,
    border: STATUS_COLORS.info.border,
  },
};

interface ReputationTimelineProps {
  timeline: ReputationTimelineEntry[];
  pagination: PaginationInfo | null;
  page: number;
  onPageChange: (page: number) => void;
}

function ImpactRow({
  entry,
  runningTotal,
}: {
  entry: ReputationTimelineEntry;
  runningTotal: number;
}) {
  const tier = tierConfig[entry.reason] || tierConfig.aligned;
  const isPositive = entry.change_amount >= 0;
  const isProposalVote = entry.vote_score !== null;

  return (
    <div
      className={`
        group relative flex items-center gap-4 px-6 py-[18px]
        bg-card dark:bg-surface-1/40
        border border-border
        transition-all duration-200
        hover:bg-card dark:hover:bg-surface-2/60
        hover:border-border dark:hover:border-border
        first:rounded-t-2xl last:rounded-b-2xl
        overflow-hidden
      `}
    >
      {/* Left color stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          isPositive ? STATUS_COLORS.positive.bg : STATUS_COLORS.negative.bg
        }`}
      />

      {/* Delta */}
      <div
        className={`font-display text-xl font-bold min-w-[60px] text-right tabular-nums ${
          isPositive ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
        }`}
      >
        {isPositive ? "+" : ""}
        {entry.change_amount}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm">{entry.description}</p>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tier.bg} ${tier.color} ${tier.border}`}
          >
            {tier.label}
          </span>
          {entry.guild_name && (
            <Badge variant="outline" className="text-xs font-normal">
              {entry.guild_name}
            </Badge>
          )}
        </div>

        {/* Candidate info */}
        {entry.candidate_name && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Candidate: <span className="text-foreground/80">{entry.candidate_name}</span>
            {entry.outcome && (
              <>
                {" \u00B7 "}
                <span
                  className={
                    entry.outcome === "approved"
                      ? STATUS_COLORS.positive.text
                      : STATUS_COLORS.negative.text
                  }
                >
                  {entry.outcome}
                </span>
              </>
            )}
          </p>
        )}

        {/* Vote details grid */}
        {isProposalVote && (
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-lg bg-muted/50 dark:bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Your Vote</p>
              <p className="text-sm font-medium tabular-nums mt-0.5">{entry.vote_score}</p>
            </div>
            <div className="rounded-lg bg-muted/50 dark:bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Consensus</p>
              <p className="text-sm font-medium tabular-nums mt-0.5">{Number(entry.consensus_score).toFixed(1)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 dark:bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Distance</p>
              <p className="text-sm font-medium tabular-nums mt-0.5">{Number(entry.alignment_distance).toFixed(1)}</p>
            </div>
            {entry.reward_amount !== null && Number(entry.reward_amount) > 0 && (
              <div className={`rounded-lg ${STATUS_COLORS.positive.bgSubtle} border ${STATUS_COLORS.positive.border} px-3 py-2`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${STATUS_COLORS.positive.text} opacity-60`}>Reward</p>
                <p className={`text-sm font-medium tabular-nums mt-0.5 ${STATUS_COLORS.positive.text}`}>
                  +{Number(entry.reward_amount).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time */}
      <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 hidden sm:block">
        {formatTimeAgo(entry.created_at)}
      </div>

      {/* Running total */}
      <div className="font-display text-sm font-bold min-w-[48px] text-right tabular-nums text-muted-foreground hidden md:block">
        {runningTotal}
      </div>
    </div>
  );
}

export function ReputationTimeline({
  timeline,
  pagination,
  page,
  onPageChange,
}: ReputationTimelineProps) {
  // Compute running totals from cumulative changes
  const runningTotals = timeline.length > 0
    ? (() => {
        const totals: number[] = [];
        let running = 0;
        // Sort by date ascending to build running sum
        const sorted = [...timeline].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        for (const entry of sorted) {
          running += entry.change_amount;
          totals.push(running);
        }
        // Map back to original order
        return timeline.map((entry) => {
          const idx = sorted.findIndex((e) => e === entry);
          return totals[idx];
        });
      })()
    : [];

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs font-bold tracking-[4px] uppercase text-muted-foreground pl-1">
          Recent Impact
        </p>
        {pagination && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {pagination.total} events
          </span>
        )}
      </div>

      {timeline.length === 0 ? (
        <Card className="text-center">
          <div className="py-16">
            <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No reputation changes yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your history will appear here after vettings are finalized.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-px">
          {timeline.map((entry, i) => (
            <ImpactRow
              key={`${entry.created_at}-${i}`}
              entry={entry}
              runningTotal={runningTotals[i] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <PaginationNav
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          className="mt-6"
        />
      )}
    </section>
  );
}
