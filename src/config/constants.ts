// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { STATUS_COLORS } from "./colors";

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
  pending: { label: "Pending", className: STATUS_COLORS.pending.badge },
  reviewing: { label: "Reviewing", className: STATUS_COLORS.info.badge },
  interviewed: { label: "Interviewed", className: STATUS_COLORS.info.badge },
  interviewing: { label: "Interviewing", className: STATUS_COLORS.info.badge },
  accepted: { label: "Accepted", className: STATUS_COLORS.positive.badge },
  offered: { label: "Offered", className: STATUS_COLORS.positive.badge },
  rejected: { label: "Rejected", className: STATUS_COLORS.negative.badge },
  hired: { label: "Hired", className: STATUS_COLORS.positive.badge },
  withdrawn: { label: "Withdrawn", className: STATUS_COLORS.neutral.badge },
};

/**
 * Shared job status badge configuration.
 * Use this instead of local getStatusColor() functions for job status badges.
 */
export const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: STATUS_COLORS.positive.badge },
  paused: { label: "Paused", className: STATUS_COLORS.warning.badge },
  closed: { label: "Closed", className: "bg-muted border border-border text-muted-foreground" },
  draft: { label: "Draft", className: STATUS_COLORS.info.badge },
};

/**
 * Shared appeal status configuration.
 * Maps appeal statuses to labels and text color classes.
 */
export const APPEAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: STATUS_COLORS.warning.text },
  reviewing: { label: "Under Review", color: STATUS_COLORS.info.text },
  upheld: { label: "Rejection Upheld", color: STATUS_COLORS.negative.text },
  overturned: { label: "Overturned — Candidate Admitted", color: STATUS_COLORS.positive.text },
};

/**
 * Shared team member status badge configuration.
 */
export const TEAM_MEMBER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: STATUS_COLORS.positive.badge },
  pending: { label: "Pending", className: STATUS_COLORS.warning.badge },
  inactive: { label: "Inactive", className: "text-muted-foreground bg-muted/30 border-border/40" },
};

/**
 * Shared guild application status badge configuration.
 */
export const GUILD_APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: STATUS_COLORS.positive.badge },
  rejected: { label: "Rejected", className: STATUS_COLORS.negative.badge },
  pending: { label: "Pending", className: STATUS_COLORS.pending.badge },
};

/**
 * Shared commit-reveal user status labels.
 */
export const COMMIT_REVEAL_STATUS_LABELS: Record<string, string> = {
  pending: "Not Yet Voted",
  committed: "Vote Submitted",
};

/**
 * Shared vetting review state badge configuration.
 * Maps the expert's review progress through commit-reveal phases.
 */
export const VETTING_REVIEW_STATE_CONFIG: Record<string, { label: string; className: string }> = {
  needs_review: { label: "Needs Review", className: STATUS_COLORS.pending.badge },
  committed: { label: "Committed", className: STATUS_COLORS.warning.badge },
  revealed: { label: "Revealed", className: STATUS_COLORS.positive.badge },
  finalized: { label: "Finalized", className: "bg-muted text-muted-foreground border-border" },
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
  accepted: { dotClass: "bg-positive shadow-sm shadow-positive/30", textClass: "text-positive" },
  rejected: { dotClass: "bg-negative shadow-sm shadow-negative/30", textClass: "text-negative" },
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
