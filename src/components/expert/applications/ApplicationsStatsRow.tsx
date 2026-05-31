import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";

interface ApplicationsStatsRowProps {
  pendingReviews: number;
  completedReviews: number;
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
    <div className={`px-5 py-4 ${last ? "" : "border-r border-border"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums mt-1 text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ApplicationsStatsRow({
  pendingReviews,
  completedReviews,
}: ApplicationsStatsRowProps) {
  return (
    <div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
        {...dataTourTarget(TOUR_TARGETS.applicationsStats)}
      >
        <StatCell label="Pending" value={pendingReviews} />
        <StatCell label="Completed" value={completedReviews} last />
      </div>
    </div>
  );
}
