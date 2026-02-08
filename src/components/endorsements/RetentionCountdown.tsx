"use client";

interface RetentionCountdownProps {
  startDate: string;
  totalDays?: number;
}

export function RetentionCountdown({
  startDate,
  totalDays = 90,
}: RetentionCountdownProps) {
  const start = new Date(startDate);
  const now = new Date();
  const elapsed = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, totalDays - elapsed);
  const percent = Math.min(100, (elapsed / totalDays) * 100);

  const barColor =
    percent < 50
      ? "bg-green-500"
      : percent < 80
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{elapsed} days elapsed</span>
        <span>{daysRemaining} days remaining</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {elapsed} / {totalDays} days
      </p>
    </div>
  );
}
