interface GuildAboutCardProps {
  description: string;
  minStake?: string;
  quorum?: string;
  avgFee?: string;
  cycleTime?: string;
}

/**
 * Sidebar card showing guild summary: description + key operating stats.
 * Used in the public guild Feed tab.
 */
export function GuildAboutCard({
  description,
  minStake = "100 VETD",
  quorum = "5 reviewers",
  avgFee = "$280 / review",
  cycleTime = "3.4 days",
}: GuildAboutCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
          About this guild
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div>
          <div className="text-muted-foreground">Min stake</div>
          <div className="text-foreground font-semibold">{minStake}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Quorum</div>
          <div className="text-foreground font-semibold">{quorum}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg fee</div>
          <div className="text-foreground font-semibold">{avgFee}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Cycle time</div>
          <div className="text-foreground font-semibold">{cycleTime}</div>
        </div>
      </div>
    </div>
  );
}
