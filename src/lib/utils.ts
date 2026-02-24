import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "1d ago";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks}w ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return `${months}mo ago`;
}

/**
 * Calculate total points (reputation + earnings)
 */
export function calculateTotalPoints(profile: {
  reputation: number;
  totalEarnings: number;
}): number {
  return profile.reputation + profile.totalEarnings;
}

/**
 * Get notification count from profile data
 * Aggregates pending proposals, unreviewed applications, and guilds with pending proposals
 */
export function getNotificationCount(profile: {
  pendingTasks: {
    pendingProposalsCount: number;
    unreviewedApplicationsCount: number;
  };
  guilds: Array<{ pendingProposals: number }>;
}): number {
  const pendingProposalsCount = profile.pendingTasks?.pendingProposalsCount || 0;
  const unreviewedApplicationsCount = profile.pendingTasks?.unreviewedApplicationsCount || 0;
  const guildsWithPendingCount = profile.guilds?.filter(g => g.pendingProposals > 0).length || 0;

  return pendingProposalsCount + unreviewedApplicationsCount + guildsWithPendingCount;
}

/**
 * Check if expert meets staking minimum
 */
export function meetsStakingMinimum(stakingStatus: {
  meetsMinimum?: boolean;
  stakedAmount?: string;
  minimumRequired?: string;
}): boolean {
  if (typeof stakingStatus.meetsMinimum === "boolean") {
    return stakingStatus.meetsMinimum;
  }

  if (stakingStatus.stakedAmount && stakingStatus.minimumRequired) {
    const staked = parseFloat(stakingStatus.stakedAmount);
    const minimum = parseFloat(stakingStatus.minimumRequired);
    return staked >= minimum;
  }

  return false;
}
