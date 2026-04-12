import { cn } from "@/lib/utils";

interface Tier {
  name: string;
  repMin: number;
  repMax: number | null;
  multiplier: string;
  color: string;
  description: string;
}

const TIERS: Tier[] = [
  {
    name: "Recruit",
    repMin: 0,
    repMax: 999,
    multiplier: "1.0×",
    color: "rank-recruit",
    description: "Starting tier. Contribute votes to prove alignment.",
  },
  {
    name: "Apprentice",
    repMin: 1000,
    repMax: 1999,
    multiplier: "1.25×",
    color: "rank-apprentice",
    description: "Early-career reviewer with demonstrable track record.",
  },
  {
    name: "Craftsman",
    repMin: 2000,
    repMax: 4999,
    multiplier: "1.5×",
    color: "rank-craftsman",
    description: "Established voice. Unlocks endorsement mentoring.",
  },
  {
    name: "Officer",
    repMin: 5000,
    repMax: 9999,
    multiplier: "1.75×",
    color: "rank-officer",
    description: "Guild leadership. Eligible to propose rubric changes.",
  },
  {
    name: "Master",
    repMin: 10000,
    repMax: null,
    multiplier: "2.0×",
    color: "rank-master",
    description: "Top tier. Governance vote weight is amplified.",
  },
];

/**
 * Visual ladder showing the five guild rank tiers, their reputation requirements,
 * and reward multipliers. Purely presentational — no client-side state.
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
        {TIERS.map((tier, i) => (
          <div
            key={tier.name}
            className="flex items-center gap-4 px-5 py-4 md:gap-6"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums md:h-11 md:w-11"
              )}
              style={{
                borderColor: `hsl(var(--${tier.color}))`,
                backgroundColor: `hsl(var(--${tier.color}) / 0.1)`,
                color: `hsl(var(--${tier.color}))`,
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h4 className="text-[16px] font-bold text-foreground">{tier.name}</h4>
                <span className="font-mono text-[12.5px] text-muted-foreground">
                  {tier.repMax
                    ? `${tier.repMin.toLocaleString()} – ${tier.repMax.toLocaleString()} rep`
                    : `${tier.repMin.toLocaleString()}+ rep`}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                {tier.description}
              </p>
            </div>
            <div className="shrink-0 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rewards
              </p>
              <p className="font-mono text-[14px] font-bold text-foreground">
                {tier.multiplier}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
