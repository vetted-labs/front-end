import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { Coins, Vote, Award, Layers } from "lucide-react";
import { STAT_ICON, STATUS_COLORS } from "@/config/colors";
import type { EarningsEntry, PaginationInfo } from "@/types";

const typeLabels: Record<string, string> = {
  voting_reward: "Voting Reward",
  endorsement: "Endorsement Reward",
};

const typeSubLabels: Record<string, string> = {
  voting_reward: "Candidate review",
  endorsement: "Endorsement payout",
};

const typeIcons: Record<string, typeof Vote> = {
  voting_reward: Vote,
  endorsement: Award,
};

function groupByDate(items: EarningsEntry[]): Record<string, EarningsEntry[]> {
  const groups: Record<string, EarningsEntry[]> = {};
  for (const item of items) {
    const key = new Date(item.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

interface EarningsTimelineProps {
  items: EarningsEntry[];
  pagination: PaginationInfo | null;
  page: number;
  onPageChange: (page: number) => void;
}

export function EarningsTimeline({ items, pagination, page, onPageChange }: EarningsTimelineProps) {
  const totalCount = pagination?.total ?? items.length;

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">Recent Transactions</h2>
        </div>
        <EmptyState
          icon={Coins}
          title="No earnings yet"
          description="No earnings found for this period."
        />
      </div>
    );
  }

  const grouped = groupByDate(items);

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">Recent Transactions</h2>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            {/* Day header */}
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                {date}
              </p>
            </div>

            {/* Transaction rows */}
            <div className="flex flex-col gap-2">
              {entries.map((entry, i) => {
                const TypeIcon = typeIcons[entry.type] || Coins;
                const subLabel = typeSubLabels[entry.type];
                const currency = entry.currency || "VETD";

                return (
                  <Card
                    key={i}
                    padding="none"
                    className="overflow-hidden group"
                  >
                    <div className="grid grid-cols-[4px_1fr_auto] sm:grid-cols-[4px_1fr_auto] items-center">
                      {/* Left accent stripe -- single brand color */}
                      <div className="w-1 self-stretch bg-primary/60 group-hover:bg-primary transition-colors" />

                      {/* Info section */}
                      <div className="flex items-center gap-4 px-4 py-3.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${STAT_ICON.bg} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className={`w-4 h-4 ${STAT_ICON.text}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">
                              {typeLabels[entry.type] || entry.type}
                              {entry.candidate_name && (
                                <span className="text-muted-foreground font-normal">
                                  : {entry.candidate_name}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/50">
                            <span>
                              {new Date(entry.created_at).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {entry.guild_name && (
                              <>
                                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/30" />
                                <span className="flex items-center gap-2">
                                  <Layers className="w-3 h-3" />
                                  {entry.guild_name}
                                </span>
                              </>
                            )}
                            {subLabel && !entry.candidate_name && (
                              <>
                                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/30" />
                                <span>{subLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right pr-4 py-3.5 flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${STATUS_COLORS.positive.text}`}>
                          +{Number(entry.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground/40 tabular-nums mt-0.5">
                          {currency}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <PaginationNav
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
