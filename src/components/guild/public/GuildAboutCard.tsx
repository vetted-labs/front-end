interface GuildAboutCardProps {
  /**
   * Guild description. No longer rendered here — it duplicated the under-name
   * text in the public hero (VET-110). Kept in the props for backward
   * compatibility with existing call sites; safe to drop once they update.
   */
  description?: string;
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
 * Sidebar card showing key operating stats for a guild. Used in the public
 * guild Feed tab.
 *
 * The guild description that previously lived here was removed — it duplicated
 * the description shown under the guild name in the public hero. When no
 * operating stats are available the panel has nothing meaningful to show and
 * renders nothing.
 */
export function GuildAboutCard({
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

  // Nothing meaningful to render without operating stats — hide the panel.
  if (cells.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
          About this guild
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {cells.map((cell) => (
          <div key={cell.label}>
            <div className="text-muted-foreground">{cell.label}</div>
            <div className="text-foreground font-semibold">{cell.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
