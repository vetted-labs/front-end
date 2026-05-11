interface GuildAboutCardProps {
  description: string;
  /**
   * Operating stats. All optional — when the backend doesn't expose them
   * (current state for most guilds) the corresponding cells are dropped
   * rather than rendered with fabricated numbers.
   */
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
  minStake,
  quorum,
  avgFee,
  cycleTime,
}: GuildAboutCardProps) {
  const cells: Array<{ label: string; value: string }> = [];
  if (minStake) cells.push({ label: "Min stake", value: minStake });
  if (quorum) cells.push({ label: "Quorum", value: quorum });
  if (avgFee) cells.push({ label: "Avg fee", value: avgFee });
  if (cycleTime) cells.push({ label: "Cycle time", value: cycleTime });

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

      {cells.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          {cells.map((cell) => (
            <div key={cell.label}>
              <div className="text-muted-foreground">{cell.label}</div>
              <div className="text-foreground font-semibold">{cell.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
