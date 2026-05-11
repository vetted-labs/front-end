interface TrendingTopic {
  name: string;
  count: number;
}

interface GuildTrendingCardProps {
  /**
   * Topics derived from recent post titles. When undefined or empty the card
   * does not render — we don't fabricate trending tags.
   */
  topics?: TrendingTopic[];
  title?: string;
}

/**
 * Trending hashtag/topic list. Renders nothing when no real trending data
 * is available; wire `topics` once Phase 5 exposes a topics endpoint.
 */
export function GuildTrendingCard({
  topics,
  title = "Trending this week",
}: GuildTrendingCardProps) {
  if (!topics || topics.length === 0) return null;
  return (
    <div className="rounded-xl border border-surface-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
          {title}
        </span>
      </div>

      <div>
        {topics.map((topic, i) => (
          <div
            key={topic.name}
            className={`flex items-center justify-between py-2 text-sm ${
              i < topics.length - 1 ? "border-b border-surface-border" : ""
            }`}
          >
            <span className="font-medium text-foreground">{topic.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {topic.count} mentions
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
