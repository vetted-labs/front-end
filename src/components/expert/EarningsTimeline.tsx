import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { Coins, Vote, Award } from "lucide-react";
import type { EarningsEntry, PaginationInfo } from "@/types";

const typeLabels: Record<string, string> = {
  voting_reward: "Voting Reward",
  endorsement: "Endorsement Reward",
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
  if (items.length === 0) {
    return (
      <Card className="text-center">
        <div className="py-16">
          <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No earnings found for this period.</p>
        </div>
      </Card>
    );
  }

  const grouped = groupByDate(items);

  return (
    <>
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => {
          return (
            <div key={date}>
              {/* Day header */}
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{date}</p>
              </div>

              <Card padding="none">
                <div className="divide-y divide-border/40 dark:divide-white/[0.04]">
                  {entries.map((entry, i) => {
                    const TypeIcon = typeIcons[entry.type] || Coins;
                    return (
                      <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-4 h-4 text-emerald-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {typeLabels[entry.type] || entry.type}
                            </p>
                            {entry.guild_name && (
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {entry.guild_name}
                              </Badge>
                            )}
                          </div>
                          {entry.candidate_name && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                              {entry.candidate_name}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{Number(entry.amount).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 tabular-nums">
                            {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {pagination && (
        <PaginationNav
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
