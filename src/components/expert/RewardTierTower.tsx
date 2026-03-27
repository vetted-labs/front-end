import { Check } from "lucide-react";
import { getRewardTierProgress, REWARD_TIERS } from "@/types";
import { REWARD_TIER_COLORS } from "@/config/colors";

interface RewardTierTowerProps {
  reputation: number;
}

/** Map tier names to visual config for the tower display */
const TOWER_TIERS = [
  {
    tier: REWARD_TIERS[2], // Authority (top)
    symbol: "\u2666", // diamond
    benefits: [
      "Priority job queue",
      "1.5x reward multiplier",
      "Guild leadership eligible",
      "Maximum governance weight",
    ],
  },
  {
    tier: REWARD_TIERS[1], // Established (middle)
    symbol: "\u2605", // star
    benefits: [
      "Enhanced reward share",
      "1.25x reward multiplier",
      "Proposal creation rights",
      "Priority endorsement queue",
    ],
  },
  {
    tier: REWARD_TIERS[0], // Foundation (bottom)
    symbol: "\u25CF", // circle
    benefits: [
      "Base reward share",
      "1.0x reward multiplier",
      "Standard vetting access",
      "Governance participation",
    ],
  },
];

export function RewardTierTower({ reputation }: RewardTierTowerProps) {
  const { tier: currentTier } = getRewardTierProgress(reputation);

  return (
    <section>
      <p className="text-xs font-bold tracking-[4px] uppercase text-muted-foreground mb-8 pl-1">
        Tier Progression
      </p>
      <div className="relative flex flex-col gap-0 max-w-[520px] mx-auto">
        {/* Connecting rail */}
        <div className="absolute left-[32px] top-0 bottom-0 w-0.5 bg-border" />

        {TOWER_TIERS.map(({ tier, symbol, benefits }) => {
          const isCurrent = tier.name === currentTier.name;
          const isCompleted = reputation >= (tier.maxReputation ?? Infinity);
          const isLocked = reputation < tier.minReputation;
          const colors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;
          const pointsNeeded = tier.minReputation - reputation;

          return (
            <div
              key={tier.name}
              className="relative pl-[72px] py-4"
            >
              {/* Node on rail */}
              <div
                className={`
                  absolute left-[22px] top-1/2 -translate-y-1/2 w-[22px] h-[22px]
                  rounded-full border-2 flex items-center justify-center z-10
                  ${isCurrent
                    ? "border-warning bg-warning/15"
                    : isLocked
                      ? "border-muted-foreground/20 bg-muted-foreground/[0.04]"
                      : "border-muted-foreground/30 bg-muted-foreground/[0.06]"
                  }
                `}
                style={isCurrent ? { animation: "rep-gold-node-pulse 2.5s ease-in-out infinite" } : undefined}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isCurrent
                      ? "bg-warning"
                      : isLocked
                        ? "bg-muted-foreground/15"
                        : "bg-muted-foreground/50"
                  }`}
                />
              </div>

              {/* Tier card */}
              <div
                className={`
                  rounded-xl p-6 transition-all
                  ${isCurrent
                    ? "bg-warning/5 border border-warning/20"
                    : isLocked
                      ? "bg-muted-foreground/[0.02] border border-dashed border-muted-foreground/10 opacity-60"
                      : "bg-muted-foreground/[0.02] border border-muted-foreground/[0.06] opacity-50"
                  }
                `}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className={`font-display text-xl font-bold ${isCurrent ? "text-warning" : isLocked ? colors.text : "text-muted-foreground"}`}>
                      {symbol} {tier.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {tier.maxReputation
                        ? `${tier.minReputation.toLocaleString()} \u2013 ${tier.maxReputation.toLocaleString()} rep`
                        : `${tier.minReputation.toLocaleString()}+ rep`}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full bg-warning/15 text-warning">
                      CURRENT
                    </span>
                  )}
                  {isLocked && (
                    <span className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full bg-muted-foreground/[0.04] text-muted-foreground">
                      LOCKED
                    </span>
                  )}
                  {isCompleted && !isCurrent && (
                    <span className="text-xs text-muted-foreground">
                      &#10003; Completed
                    </span>
                  )}
                </div>

                {/* Expanded benefits for current tier */}
                {isCurrent && (
                  <div className="mt-4 pt-4 border-t border-warning/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                )}

                {/* Points needed for locked tiers */}
                {isLocked && pointsNeeded > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex gap-2">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-[3px] h-[3px] rounded-full bg-muted-foreground/20"
                          style={{ animation: `rep-dot-float 2s ease-in-out infinite ${i * 0.3}s` }}
                        />
                      ))}
                    </span>
                    {pointsNeeded.toLocaleString()} more reputation to unlock
                  </div>
                )}
              </div>

              {/* Floating particles for current tier */}
              {isCurrent && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="absolute w-0.5 h-0.5 rounded-full bg-warning opacity-0"
                      style={{
                        left: `${24 + (i % 3) * 6}px`,
                        bottom: `${20 + i * 12}%`,
                        animation: `rep-particle-rise 4s ease-in-out infinite ${i * 0.5}s`,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
