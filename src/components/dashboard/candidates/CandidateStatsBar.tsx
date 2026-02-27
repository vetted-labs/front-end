"use client";

interface CandidateStatsBarProps {
  total: number;
  pending: number;
  accepted: number;
  reviewing: number;
}

export function CandidateStatsBar({ total, pending, accepted, reviewing }: CandidateStatsBarProps) {
  return (
    <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border border-border/60 bg-border/60 dark:bg-white/[0.04] dark:border-white/[0.06]">
      <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Total</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{total}</p>
      </div>
      <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Pending</p>
        <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">{pending}</p>
      </div>
      <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Accepted</p>
        <p className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">{accepted}</p>
      </div>
      <div className="bg-card/80 dark:bg-card/40 backdrop-blur-sm px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Reviewing</p>
        <p className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">{reviewing}</p>
      </div>
    </div>
  );
}
