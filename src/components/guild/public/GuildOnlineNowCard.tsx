import type { ExpertMember } from "@/types";

interface GuildOnlineNowCardProps {
  experts: ExpertMember[];
  /** How many avatars to show before collapsing into a "+N" tile. */
  maxAvatars?: number;
}

/**
 * Stacked-avatar card showing currently-online members.
 * Presence is currently a static placeholder — the first N experts.
 * When real presence lands (websocket/poll), pass already-filtered list.
 */
export function GuildOnlineNowCard({
  experts,
  maxAvatars = 5,
}: GuildOnlineNowCardProps) {
  // No real presence yet — surface up to N members as the "online" sample.
  // This keeps the card useful pre-realtime presence; Phase 5 backend work
  // can swap the source list to a live one.
  const onlineSample = experts.slice(0, maxAvatars);
  const totalOnline = Math.max(0, experts.length);
  const overflow = Math.max(0, experts.length - maxAvatars);
  const reviewing = Math.min(3, totalOnline); // placeholder

  return (
    <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
          Online now
        </span>
        <button className="text-[11px] font-semibold text-primary hover:underline">
          View all
        </button>
      </div>

      <div className="flex items-center">
        {onlineSample.map((expert) => (
          <div
            key={expert.id}
            className="-ml-2 first:ml-0 w-7 h-7 rounded-lg bg-surface-2 border-2 border-surface-1 flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
            title={expert.fullName}
          >
            {expert.fullName.slice(0, 1).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="-ml-2 w-7 h-7 rounded-lg bg-surface-3 border-2 border-surface-1 flex items-center justify-center text-[11px] font-semibold text-foreground">
            +{overflow}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-positive" />
        {totalOnline} active · {reviewing} reviewing now
      </div>
    </div>
  );
}
