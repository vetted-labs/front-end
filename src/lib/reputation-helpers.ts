import { REPUTATION_DECAY_CYCLE_DAYS } from "@/config/constants";
import type { ReputationTimelineEntry } from "@/types";

/**
 * Returns the number of days until the next reputation decay cycle fires,
 * based on the most recent activity timestamp. Returns 0 if no valid activity
 * exists or if the decay date has already passed.
 */
export function getDaysUntilDecay(
  recentActivity: Array<{ timestamp: string }> | undefined,
): number | null {
  if (!recentActivity?.length) return 0;
  const timestamps = recentActivity
    .map((a) => new Date(a.timestamp).getTime())
    .filter((t) => !isNaN(t));
  if (timestamps.length === 0) return 0;
  const mostRecent = Math.max(...timestamps);
  const decayDate = mostRecent + REPUTATION_DECAY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((decayDate - Date.now()) / (24 * 60 * 60 * 1000)));
}

/**
 * Reconstructs 6 months of score history by replaying the timeline backwards
 * from the current reputation score.
 */
export function buildMonthlyScores(
  timeline: ReputationTimelineEntry[],
  currentReputation: number,
): { month: string; score: number }[] {
  // Sort timeline newest first
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Group changes by month, walking back from current score
  const now = new Date();
  const months: { month: string; score: number }[] = [];
  let runningScore = currentReputation;

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });

    months.unshift({ month: label, score: runningScore });

    // Subtract changes from this month to get previous month's score
    const monthChanges = sorted.filter((e) => {
      const eDate = new Date(e.created_at);
      return (
        eDate.getFullYear() === d.getFullYear() &&
        eDate.getMonth() === d.getMonth()
      );
    });

    const totalChange = monthChanges.reduce((sum, e) => sum + e.change_amount, 0);
    runningScore -= totalChange;
  }

  return months;
}

/**
 * Computes vote accuracy as the percentage of aligned votes out of all
 * scored votes (aligned + deviation). Returns 100 when there are no votes.
 */
export function computeAccuracy(alignedCount: number, deviationCount: number): number {
  const total = alignedCount + deviationCount;
  return total > 0 ? Math.round((alignedCount / total) * 100) : 100;
}

/**
 * Computes consistency as the ratio of gains to total activity (gains + |losses|),
 * capped at 100. Returns 100 when there is no activity.
 */
export function computeConsistency(totalGains: number, totalLosses: number): number {
  const totalActivity = Math.abs(totalGains) + Math.abs(totalLosses);
  return totalActivity > 0
    ? Math.min(100, Math.round((Math.abs(totalGains) / totalActivity) * 100))
    : 100;
}
