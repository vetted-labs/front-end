import { cn } from "@/lib/utils";

interface Rank {
  name: string;
  repMin: number;
  repMax: number | null;
  rewardTier: string;
  multiplier: string;
  color: string;
  unlocks: string;
}

const RANKS: Rank[] = [
  {
    name: "Recruit",
    repMin: 0,
    repMax: 999,
    rewardTier: "Foundation",
    multiplier: "1.0×",
    color: "rank-recruit",
    unlocks: "Vote on applications",
  },
  {
    name: "Apprentice",
    repMin: 1000,
    repMax: 1999,
    rewardTier: "Established",
    multiplier: "1.25×",
    color: "rank-apprentice",
    unlocks: "Create guild posts",
  },
  {
    name: "Craftsman",
    repMin: 2000,
    repMax: 4999,
    rewardTier: "Authority",
    multiplier: "1.5×",
    color: "rank-craftsman",
    unlocks: "Moderate content, mark duplicates",
  },
  {
    name: "Officer",
    repMin: 5000,
    repMax: 9999,
    rewardTier: "Authority",
    multiplier: "1.5×",
    color: "rank-officer",
    unlocks: "Propose rubric changes, vote on appeals",
  },
  {
    name: "Master",
    repMin: 10000,
    repMax: null,
    rewardTier: "Authority",
    multiplier: "1.5×",
    color: "rank-master",
    unlocks: "Eligible for Guild Master election (if elected: 1.5× governance vote bonus)",
  },
];

/**
 * Visual ladder showing the five guild ranks, their reputation requirements,
 * reward tier, and what each rank unlocks. Purely presentational.
 */
export function RankTierLadder() {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-5 py-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Guild rank ladder
        </p>
      </div>
      <div className="divide-y divide-border">
        {RANKS.map((rank, i) => (
          <div
            key={rank.name}
            className="flex items-start gap-4 px-5 py-4 md:gap-6"
          >
            <div
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums md:h-11 md:w-11"
              )}
              style={{
                borderColor: `hsl(var(--${rank.color}))`,
                backgroundColor: `hsl(var(--${rank.color}) / 0.1)`,
                color: `hsl(var(--${rank.color}))`,
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h4 className="text-[16px] font-bold text-foreground">{rank.name}</h4>
                <span className="font-mono text-[12.5px] text-muted-foreground">
                  {rank.repMax
                    ? `${rank.repMin.toLocaleString()} – ${rank.repMax.toLocaleString()} rep`
                    : `${rank.repMin.toLocaleString()} rep (max)`}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                {rank.unlocks}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="rounded-md border border-border bg-muted/50 px-2.5 py-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {rank.rewardTier}
                </p>
                <p className="font-mono text-[14px] font-bold text-foreground">
                  {rank.multiplier}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
