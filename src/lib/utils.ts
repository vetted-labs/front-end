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

/**
 * Truncate an Ethereum address: 0x1234...abcd
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a date string to a short readable format (e.g. "Jan 5, 2025")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date string to a relative time (e.g. "2d ago", "Just now")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Format a deadline/countdown to a human-readable remaining time.
 * Returns "Expired" (or custom label) when past deadline.
 * e.g. "3d 5h", "45m", "2h 30m"
 */
export function formatDeadline(deadline: string, expiredLabel = "Expired"): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return expiredLabel;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format a salary range to a human-readable string.
 * e.g. "$80k - $120k", "From $50k", "Up to $200k"
 */
export function formatSalaryRange(
  salary: { min?: number | null; max?: number | null; currency?: string },
): string {
  const symbol = salary.currency === "EUR" ? "€" : salary.currency === "GBP" ? "£" : "$";
  const fmtK = (n: number) => `${symbol}${Math.round(n / 1000)}k`;

  if (salary.min && salary.max) return `${fmtK(salary.min)} - ${fmtK(salary.max)}`;
  if (salary.min) return `From ${fmtK(salary.min)}`;
  if (salary.max) return `Up to ${fmtK(salary.max)}`;
  return "Salary not specified";
}
