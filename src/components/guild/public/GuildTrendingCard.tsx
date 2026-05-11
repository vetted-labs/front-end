interface TrendingTopic {
  name: string;
  count: number;
}

interface GuildTrendingCardProps {
  /** Topics derived from recent post titles or sidebar fixtures. */
  topics?: TrendingTopic[];
  title?: string;
}

const FALLBACK_TOPICS: TrendingTopic[] = [
  { name: "#commit-reveal", count: 12 },
  { name: "#zk-proofs", count: 9 },
  { name: "#rust", count: 7 },
  { name: "#postgres", count: 6 },
];

/**
 * Trending hashtag/topic list. Currently ships with fallback topics; real
 * trending derivation lands when Phase 5 exposes a topics endpoint.
 */
export function GuildTrendingCard({
  topics = FALLBACK_TOPICS,
  title = "Trending this week",
}: GuildTrendingCardProps) {
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
