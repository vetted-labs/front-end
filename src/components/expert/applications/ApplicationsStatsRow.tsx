interface ApplicationsStatsRowProps {
  pendingReviews: number;
  proposalsToVote: number;
  completedReviews: number;
  guildsActive: number;
}

function StatCell({
  label,
  value,
  last,
}: {
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${last ? "" : "border-r border-border/40"}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-extrabold tabular-nums mt-1 text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ApplicationsStatsRow({
  pendingReviews,
  proposalsToVote,
  completedReviews,
  guildsActive,
}: ApplicationsStatsRowProps) {
  return (
    <div className="border border-white/[0.06] rounded-2xl bg-card/40 backdrop-blur-md overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        <StatCell label="Pending" value={pendingReviews} />
        <StatCell label="To Vote" value={proposalsToVote} />
        <StatCell label="Completed" value={completedReviews} />
        <StatCell label="Guilds" value={guildsActive} last />
      </div>
    </div>
  );
}
