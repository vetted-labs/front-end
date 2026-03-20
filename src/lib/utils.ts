import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiError } from "@/lib/api"

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
 * Format a date string to month + year (e.g. "Jan 2025" or "January 2025")
 */
export function formatDateMonthYear(dateString: string, monthFormat: "short" | "long" = "short"): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: monthFormat,
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

/**
 * Ensure a URL has a protocol prefix (defaults to https://)
 */
export function ensureHttps(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

/**
 * Check if an error is transient and worth retrying.
 * Only retry on network errors and specific HTTP statuses (429, 502, 503, 504).
 * Deterministic failures (400, 401, 403, 404, 500) fail immediately.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    const retryableStatuses = [429, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }
  // Network errors (fetch failed, timeout, etc.) are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

/**
 * Retry an async function with progressive backoff delays.
 * Only retries on transient errors (network failures, 429, 502-504).
 * Deterministic failures (400, 404, 500, etc.) fail immediately.
 * Returns the result on success, or calls `onExhausted` if all retries fail.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  delays: number[] = [2000, 4000, 6000],
  onExhausted?: () => void,
): Promise<T | undefined> {
  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || attempt >= delays.length - 1) {
        onExhausted?.();
        return undefined;
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  onExhausted?.();
  return undefined;
}

/**
 * Strip markdown syntax for plain-text previews
 */
/**
 * Format a VETD token / earnings amount as a whole number with commas.
 * e.g. 525.037 → "$525", 1234 → "$1,234"
 */
export function formatVetd(amount: number | string | null | undefined, prefix = "$"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return `${prefix}0`;
  return `${prefix}${Math.round(num).toLocaleString()}`;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")     // bold
    .replace(/\*(.*?)\*/g, "$1")          // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "")   // code
    .replace(/^#+\s+/gm, "")             // headings
    .replace(/^[-*]\s+/gm, "")           // list items
    .replace(/^\d+\.\s+/gm, "")          // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\n{2,}/g, " ");             // collapse newlines
}
