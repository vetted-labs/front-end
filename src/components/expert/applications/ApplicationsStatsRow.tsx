import { Card } from "@/components/ui/card";

interface ApplicationsStatsRowProps {
  pendingReviews: number;
  proposalsToVote: number;
  completedThisMonth: number;
  guildsActive: number;
}

export function ApplicationsStatsRow({
  pendingReviews,
  proposalsToVote,
  completedThisMonth,
  guildsActive,
}: ApplicationsStatsRowProps) {
  const stats = [
    { label: "Pending Reviews", value: pendingReviews },
    { label: "Proposals to Vote", value: proposalsToVote },
    { label: "Completed This Month", value: completedThisMonth },
    { label: "Guilds Active", value: guildsActive },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
