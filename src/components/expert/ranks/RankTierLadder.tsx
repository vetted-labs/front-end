"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { getRankColors, STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";
import { GUILD_RANK_CONFIGS, RANK_ICONS } from "./config";
import type { ExpertStats } from "./types";

interface RankTierLadderProps {
  currentRankIndex: number;
  stats: ExpertStats;
  isLoading?: boolean;
}

/**
 * Vertical timeline of all 5 ranks with expand-to-reveal requirements/unlocks.
 * The visual rail is a single line that fills up to the current rank.
 */
export function RankTierLadder({
  currentRankIndex,
  stats,
  isLoading,
}: RankTierLadderProps) {
  const [expandedRank, setExpandedRank] = useState<string | null>(null);

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div
        className="absolute left-[23px] top-6 bottom-6 w-px bg-border/60 dark:bg-muted/40"
        aria-hidden="true"
      />
      {/* Achieved portion of the line */}
      {!isLoading && currentRankIndex > 0 && (
        <div
          className="absolute left-[23px] top-6 w-px bg-positive/40"
          style={{
            height: `calc(${(currentRankIndex / (GUILD_RANK_CONFIGS.length - 1)) * 100}% - 12px)`,
          }}
          aria-hidden="true"
        />
      )}

      <div className="space-y-2">
        {GUILD_RANK_CONFIGS.map((rank, i) => {
          const isAchieved = isLoading ? false : i < currentRankIndex;
          const isCurrent = isLoading ? false : i === currentRankIndex;
          const isLocked = isLoading ? true : i > currentRankIndex;
          const isExpanded = expandedRank === rank.role;
          const colors = getRankColors(rank.role);
          const Icon = RANK_ICONS[rank.role];

          return (
            <div key={rank.role} className="relative">
              <div
                className={cn(
                  "ml-12 rounded-xl border bg-card overflow-hidden transition-all",
                  isCurrent && cn(colors.border, "shadow-md", colors.glow),
                  isAchieved && "border-border",
                  isLocked && "border-border opacity-70",
                )}
              >
                <button
                  onClick={() => setExpandedRank(isExpanded ? null : rank.role)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-display font-semibold">
                        {rank.name}
                      </span>
                      {isLocked && (
                        <Lock className="w-3 h-3 text-muted-foreground/40" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 hidden sm:block">
                      {rank.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <div
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] border",
                        colors.badge,
                      )}
                    >
                      Current
                    </div>
                  )}
                  {isAchieved && (
                    <div
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] border",
                        STATUS_COLORS.positive.badge,
                      )}
                    >
                      Achieved
                    </div>
                  )}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground/40 transition-transform shrink-0",
                      isExpanded && "rotate-180",
                      "group-hover:text-muted-foreground",
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="grid sm:grid-cols-2 gap-6 pt-4">
                      {/* Requirements */}
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                          Requirements
                        </p>
                        <ul className="space-y-2">
                          {rank.requirements.map((req) => {
                            let met = false;
                            if (!isLoading && i <= currentRankIndex) {
                              met = true;
                            } else if (!isLoading && req.metric && req.target !== null) {
                              const current = stats[req.metric];
                              met = current !== null && current >= req.target;
                            }

                            return (
                              <li
                                key={req.label}
                                className="flex items-start gap-2 text-sm"
                              >
                                {met ? (
                                  <div
                                    className={cn(
                                      "flex h-[18px] w-[18px] items-center justify-center rounded-full mt-0.5 shrink-0",
                                      STATUS_COLORS.positive.bgSubtle,
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "w-3 h-3",
                                        STATUS_COLORS.positive.text,
                                      )}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-muted-foreground/20 mt-0.5 shrink-0" />
                                )}
                                <span
                                  className={cn(
                                    "text-sm",
                                    met
                                      ? "text-muted-foreground"
                                      : "text-foreground",
                                  )}
                                >
                                  {req.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Unlocks */}
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                          Unlocks
                        </p>
                        <ul className="space-y-2">
                          {rank.unlocks.map((unlock) => (
                            <li
                              key={unlock}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span
                                className={cn(
                                  "inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                  colors.bg,
                                )}
                              />
                              {unlock}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline node */}
              <div className="absolute left-0 top-3.5 flex items-center justify-center w-[47px]">
                <div
                  className={cn(
                    "w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all",
                    isAchieved &&
                      cn(STATUS_COLORS.positive.bgSubtle, "ring-2 ring-positive/30"),
                    isCurrent &&
                      cn(
                        colors.bgSubtle,
                        "ring-2",
                        colors.text,
                        "shadow-lg",
                        colors.glow,
                      ),
                    isLocked && "bg-muted/50 dark:bg-muted/30",
                  )}
                >
                  {isAchieved ? (
                    <Check
                      className={cn("w-4 h-4", STATUS_COLORS.positive.text)}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isCurrent ? colors.text : "text-muted-foreground/40",
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
