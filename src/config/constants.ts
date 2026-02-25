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
