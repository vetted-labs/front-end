import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Activity } from "lucide-react";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { formatTimeAgo, formatDate } from "@/lib/utils";
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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

interface ReputationTimelineProps {
  timeline: ReputationTimelineEntry[];
  pagination: PaginationInfo | null;
  page: number;
  onPageChange: (page: number) => void;
}

function TimelineEntry({ entry }: { entry: ReputationTimelineEntry }) {
  const tier = tierConfig[entry.reason] || tierConfig.aligned;
  const isPositive = entry.change_amount >= 0;
  const isProposalVote = entry.vote_score !== null;

  return (
    <div className="relative pl-14 group">
      {/* Timeline dot */}
      <div
        className={`absolute left-[16px] top-[20px] w-[15px] h-[15px] rounded-full border-2 border-background z-10 ${
          isPositive
            ? `${STATUS_COLORS.positive.dot} shadow-sm`
            : `${STATUS_COLORS.negative.dot} shadow-sm`
        }`}
      />

      <Card
        padding="none"
        hover
        className="transition-all"
      >
        <div className="p-4 sm:p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
                  isPositive ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
                }`}
              >
                {isPositive ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5" />
                )}
                {isPositive ? "+" : ""}
                {entry.change_amount}
              </span>

              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tier.bg} ${tier.color} ${tier.border}`}
              >
                {tier.label}
              </span>

              {entry.guild_name && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  {entry.guild_name}
                </Badge>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums flex-shrink-0">
              {formatTimeAgo(entry.created_at)}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mt-2">{entry.description}</p>

          {/* Candidate info */}
          {entry.candidate_name && (
            <p className="text-xs text-muted-foreground/70 mt-1">
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
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Your Vote</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{entry.vote_score}</p>
              </div>
              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Consensus</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{Number(entry.consensus_score).toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 dark:bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Distance</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{Number(entry.alignment_distance).toFixed(1)}</p>
              </div>
              {entry.reward_amount !== null && Number(entry.reward_amount) > 0 && (
                <div className={`rounded-lg ${STATUS_COLORS.positive.bgSubtle} border ${STATUS_COLORS.positive.border} px-3 py-2`}>
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${STATUS_COLORS.positive.text} opacity-60`}>Reward</p>
                  <p className={`text-sm font-semibold tabular-nums mt-0.5 ${STATUS_COLORS.positive.text}`}>
                    +{Number(entry.reward_amount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Full date on hover */}
          <p className="text-[10px] text-muted-foreground/40 mt-2 tabular-nums">
            {formatDate(entry.created_at)} at {formatTime(entry.created_at)}
          </p>
        </div>
      </Card>
    </div>
  );
}

export function ReputationTimeline({
  timeline,
  pagination,
  page,
  onPageChange,
}: ReputationTimelineProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
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
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border/60 dark:bg-white/[0.06]" />

          <div className="space-y-1">
            {timeline.map((entry, i) => (
              <TimelineEntry key={i} entry={entry} />
            ))}
          </div>
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
    </div>
  );
}
