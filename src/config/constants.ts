// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8-12 years)" },
  { value: "principal", label: "Principal (12+ years)" },
];

export const JOB_TYPES = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Freelance", label: "Freelance" },
];

export const LOCATION_TYPES = [
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "On-site", label: "On-site" },
];

export const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

export const INDUSTRIES = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "education", label: "Education" },
  { value: "gaming", label: "Gaming" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT/Web3" },
  { value: "other", label: "Other" },
];

export const JOB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

export const APPLICATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
  { value: "accepted", label: "Accepted" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "ETH", label: "ETH (Ξ)" },
];

export const SALARY_RANGES = [
  { value: "0-50000", label: "$0 - $50,000" },
  { value: "50000-100000", label: "$50,000 - $100,000" },
  { value: "100000-150000", label: "$100,000 - $150,000" },
  { value: "150000-200000", label: "$150,000 - $200,000" },
  { value: "200000+", label: "$200,000+" },
];

export const SOCIAL_PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  { value: "github", label: "GitHub", placeholder: "https://github.com/..." },
  { value: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/..." },
  { value: "portfolio", label: "Portfolio / Website", placeholder: "https://..." },
  { value: "dribbble", label: "Dribbble", placeholder: "https://dribbble.com/..." },
  { value: "behance", label: "Behance", placeholder: "https://behance.net/..." },
  { value: "kaggle", label: "Kaggle", placeholder: "https://kaggle.com/..." },
  { value: "other", label: "Other", placeholder: "https://..." },
] as const;

/**
 * Shared application status badge configuration.
 * Use this everywhere you need status colors/labels instead of defining local statusConfig objects.
 */
export const APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  reviewing: { label: "Reviewing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  interviewed: { label: "Interviewed", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  interviewing: { label: "Interviewing", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  offered: { label: "Offered", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  hired: { label: "Hired", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

/**
 * Shared job status badge configuration.
 * Use this instead of local getStatusColor() functions for job status badges.
 */
export const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" },
  paused: { label: "Paused", className: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400" },
  closed: { label: "Closed", className: "bg-muted border border-border text-muted-foreground" },
  draft: { label: "Draft", className: "bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400" },
};

/**
 * Shared appeal status configuration.
 * Maps appeal statuses to labels and text color classes.
 */
export const APPEAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "text-amber-500" },
  reviewing: { label: "Under Review", color: "text-blue-500" },
  upheld: { label: "Rejection Upheld", color: "text-red-500" },
  overturned: { label: "Overturned — Candidate Admitted", color: "text-emerald-500" },
};

/**
 * Shared team member status badge configuration.
 */
export const TEAM_MEMBER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" },
  pending: { label: "Pending", className: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
  inactive: { label: "Inactive", className: "text-muted-foreground bg-muted/30 border-border/40" },
};

/**
 * Shared guild application status badge configuration.
 */
export const GUILD_APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Rejected", className: "text-red-500 bg-red-500/10 border-red-500/20" },
  pending: { label: "Pending", className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
};

/**
 * Shared commit-reveal user status labels.
 */
export const COMMIT_REVEAL_STATUS_LABELS: Record<string, string> = {
  pending: "Not Yet Voted",
  committed: "Vote Submitted",
};

/**
 * Shared governance proposal status configuration.
 */
export const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  passed: { label: "Passed", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

/**
 * Governance approval thresholds by proposal type (whitepaper §3).
 * Standard = 51%, Major = 67%, Emergency = 75%.
 */
export const GOVERNANCE_THRESHOLDS: Record<string, { threshold: number; label: string; quorumPercent: number }> = {
  guild_policy:          { threshold: 51, label: "Standard (51%)",  quorumPercent: 10 },
  guild_creation:        { threshold: 51, label: "Standard (51%)",  quorumPercent: 10 },
  guild_master_election: { threshold: 51, label: "Standard (51%)",  quorumPercent: 10 },
  general:               { threshold: 51, label: "Standard (51%)",  quorumPercent: 10 },
  parameter_change:      { threshold: 51, label: "Standard (51%)",  quorumPercent: 10 },
  protocol_upgrade:      { threshold: 67, label: "Major (67%)",     quorumPercent: 15 },
  treasury_spend:        { threshold: 67, label: "Major (67%)",     quorumPercent: 15 },
  emergency:             { threshold: 75, label: "Emergency (75%)", quorumPercent: 5 },
};

export const DEFAULT_GOVERNANCE_THRESHOLD = { threshold: 51, label: "Standard (51%)", quorumPercent: 10 };

/**
 * Compute merit-weighted vote weight (whitepaper §3 governance formula).
 * Vote Weight = 1 * (1 + min(reputation / 1000, 2.0)), capped at 3.0.
 * Guild Masters get 1.5x multiplier, capped at 4.5.
 */
export function computeVoteWeight(reputation: number, isGuildMaster: boolean = false): number {
  const base = 1;
  const repBonus = Math.min(reputation / 1000, 2.0);
  const weight = base * (1 + repBonus);
  const capped = Math.min(weight, 3.0);
  return isGuildMaster ? Math.min(capped * 1.5, 4.5) : capped;
}

/**
 * Guild hierarchy ranks with promotion criteria (whitepaper §5).
 */
export const GUILD_RANK_CRITERIA: Record<string, { minReviews: number; minConsensus: number; minEndorsements: number; requiresElection: boolean }> = {
  recruit:    { minReviews: 0,   minConsensus: 0,  minEndorsements: 0, requiresElection: false },
  apprentice: { minReviews: 10,  minConsensus: 70, minEndorsements: 0, requiresElection: false },
  craftsman:  { minReviews: 50,  minConsensus: 75, minEndorsements: 5, requiresElection: false },
  officer:    { minReviews: 100, minConsensus: 80, minEndorsements: 10, requiresElection: false },
  master:     { minReviews: 100, minConsensus: 80, minEndorsements: 10, requiresElection: true },
};

export const GUILD_RANK_ORDER: string[] = ["recruit", "apprentice", "craftsman", "officer", "master"];

/** Reputation decay: days of inactivity before decay warning / actual decay. */
export const REPUTATION_DECAY_WARNING_DAYS = 21;
export const REPUTATION_DECAY_CYCLE_DAYS = 30;

/**
 * Shared application status timeline dot/text color configuration.
 * Used specifically for timeline visualization where dot + text colors are needed.
 */
export const APPLICATION_STATUS_TIMELINE_CONFIG: Record<string, { dotClass: string; textClass: string }> = {
  accepted: { dotClass: "bg-green-500 shadow-sm shadow-green-500/30", textClass: "text-green-600 dark:text-green-400" },
  rejected: { dotClass: "bg-red-500 shadow-sm shadow-red-500/30", textClass: "text-red-600 dark:text-red-400" },
};

export const APPLICATION_STATUS_TIMELINE_DEFAULT = {
  dotClass: "bg-primary shadow-sm shadow-primary/30",
  textClass: "text-primary",
} as const;

export const APPLICATION_STATUS_TIMELINE_NULL = {
  dotClass: "bg-muted-foreground",
  textClass: "text-muted-foreground",
} as const;

export const SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Solidity",
  "Rust",
  "Go",
  "AWS",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "PostgreSQL",
  "MongoDB",
  "Web3",
  "Smart Contracts",
  "DeFi",
];
