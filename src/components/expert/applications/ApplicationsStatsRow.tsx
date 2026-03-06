import { Clock, Vote, CheckCircle2, Shield } from "lucide-react";

interface ApplicationsStatsRowProps {
  pendingReviews: number;
  proposalsToVote: number;
  completedReviews: number;
  guildsActive: number;
}

const stats = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    iconBg: "bg-amber-500/10 border-amber-400/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "proposals",
    label: "To Vote",
    icon: Vote,
    iconBg: "bg-blue-500/10 border-blue-400/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10 border-emerald-400/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "guilds",
    label: "Guilds",
    icon: Shield,
    iconBg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
  },
] as const;

export function ApplicationsStatsRow({
  pendingReviews,
  proposalsToVote,
  completedReviews,
  guildsActive,
}: ApplicationsStatsRowProps) {
  const values = {
    pending: pendingReviews,
    proposals: proposalsToVote,
    completed: completedReviews,
    guilds: guildsActive,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 dark:bg-card/40 dark:border-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.iconBg}`}>
              <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">{values[stat.key]}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
