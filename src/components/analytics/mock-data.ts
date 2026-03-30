// src/components/analytics/mock-data.ts

// ── Company ──

export interface CompanyKPI {
  label: string;
  value: string;
  change: string;
  changeDirection: "up" | "down" | "neutral";
  unit?: string;
  sparklineData: number[];
  accentColor: "primary" | "positive" | "muted";
}

export const COMPANY_KPIS: CompanyKPI[] = [
  {
    label: "Applications",
    value: "1,247",
    change: "23%",
    changeDirection: "up",
    sparklineData: [42, 40, 41, 37, 33, 36, 31, 26, 29, 23, 17, 21, 15, 10, 13, 8, 5, 7, 4, 3, 4, 2],
    accentColor: "primary",
  },
  {
    label: "Hires",
    value: "18",
    change: "38%",
    changeDirection: "up",
    sparklineData: [44, 42, 45, 38, 31, 34, 28, 22, 25, 18, 12, 15, 9, 5, 6, 3],
    accentColor: "positive",
  },
  {
    label: "Avg. Time to Hire",
    value: "14",
    unit: "days",
    change: "-3d",
    changeDirection: "up",
    sparklineData: [6, 8, 5, 12, 18, 14, 20, 25, 22, 28, 32, 29, 34, 38, 36, 42],
    accentColor: "muted",
  },
  {
    label: "Offer Accept Rate",
    value: "82",
    unit: "%",
    change: "5%",
    changeDirection: "up",
    sparklineData: [38, 36, 40, 32, 26, 28, 22, 17, 19, 14, 10, 12, 7, 4, 4, 3],
    accentColor: "primary",
  },
];

export interface FunnelStage {
  label: string;
  count: number;
  pct: string;
  conversionLabel?: string;
  isHired?: boolean;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  { label: "Applied", count: 1247, pct: "100%", conversionLabel: "54% screened" },
  { label: "Screened", count: 674, pct: "54%", conversionLabel: "41% to review" },
  { label: "Expert Review", count: 276, pct: "22%", conversionLabel: "28% endorsed" },
  { label: "Interview", count: 78, pct: "6.2%", conversionLabel: "23% hired" },
  { label: "Hired", count: 18, pct: "1.4%", isHired: true },
];

export interface SourceData {
  label: string;
  pct: number;
  hireRate?: string;
}

export const SOURCE_DATA: SourceData[] = [
  { label: "Guild Referral", pct: 67, hireRate: "4.2%" },
  { label: "Direct Apply", pct: 18, hireRate: "1.8%" },
  { label: "Endorsement", pct: 9, hireRate: "6.1%" },
  { label: "External", pct: 6 },
];

export interface GuildDistribution {
  name: string;
  count: number;
  pct: string;
}

export const GUILD_DISTRIBUTION: GuildDistribution[] = [
  { name: "Engineering", count: 474, pct: "38%" },
  { name: "Design", count: 274, pct: "22%" },
  { name: "Data Science", count: 224, pct: "18%" },
  { name: "Security", count: 175, pct: "14%" },
  { name: "Other", count: 100, pct: "8%" },
];

export const HEATMAP_DATA: number[][] = [
  [0, 0, 1, 0, 0, 0, 0],
  [2, 3, 3, 2, 2, 1, 0],
  [3, 4, 3, 3, 3, 1, 0],
  [3, 5, 4, 4, 3, 1, 0],
  [2, 3, 3, 2, 2, 1, 0],
  [1, 2, 2, 1, 1, 2, 1],
  [0, 1, 1, 0, 1, 1, 1],
];
export const HEATMAP_ROWS = ["6am", "9am", "12pm", "2pm", "5pm", "8pm", "11pm"];
export const HEATMAP_COLS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const APPLICATIONS_OVER_TIME: { day: string; apps: number; hires: number }[] = [
  { day: "Mar 1", apps: 18, hires: 0 },
  { day: "Mar 3", apps: 24, hires: 0 },
  { day: "Mar 5", apps: 32, hires: 1 },
  { day: "Mar 7", apps: 28, hires: 0 },
  { day: "Mar 9", apps: 38, hires: 1 },
  { day: "Mar 11", apps: 42, hires: 0 },
  { day: "Mar 13", apps: 36, hires: 1 },
  { day: "Mar 15", apps: 50, hires: 2 },
  { day: "Mar 17", apps: 44, hires: 0 },
  { day: "Mar 19", apps: 56, hires: 1 },
  { day: "Mar 21", apps: 48, hires: 2 },
  { day: "Mar 23", apps: 62, hires: 1 },
  { day: "Mar 25", apps: 58, hires: 2 },
  { day: "Mar 27", apps: 68, hires: 1 },
  { day: "Mar 29", apps: 72, hires: 2 },
  { day: "Today", apps: 78, hires: 3 },
];

export interface JobPerformance {
  name: string;
  guild: string;
  apps: number;
  appsTrend: string;
  inReview: number;
  reviewNote?: string;
  timeToHire: string;
  timeDelta: string;
  timeDeltaPositive: boolean;
  views: number;
  status: "active" | "paused";
}

export const JOB_PERFORMANCE: JobPerformance[] = [
  { name: "Senior Solidity Developer", guild: "Engineering", apps: 342, appsTrend: "+28/wk", inReview: 24, timeToHire: "4.2d", timeDelta: "-2.1d", timeDeltaPositive: true, views: 2847, status: "active" },
  { name: "Product Designer", guild: "Design", apps: 218, appsTrend: "+12/wk", inReview: 23, reviewNote: "slow", timeToHire: "8.4d", timeDelta: "+2.1d", timeDeltaPositive: false, views: 1923, status: "active" },
  { name: "Data Engineer", guild: "Data Science", apps: 187, appsTrend: "+19/wk", inReview: 15, timeToHire: "6.1d", timeDelta: "-0.8d", timeDeltaPositive: true, views: 1456, status: "active" },
  { name: "Smart Contract Auditor", guild: "Security", apps: 156, appsTrend: "+8/wk", inReview: 11, timeToHire: "5.7d", timeDelta: "-1.2d", timeDeltaPositive: true, views: 1102, status: "paused" },
  { name: "Frontend Engineer (React)", guild: "Engineering", apps: 289, appsTrend: "+31/wk", inReview: 18, timeToHire: "7.3d", timeDelta: "avg", timeDeltaPositive: true, views: 2201, status: "active" },
];

export const TIME_TO_HIRE_DISTRIBUTION = [
  { range: "1-3d", count: 2, opacity: 0.1 },
  { range: "4-7d", count: 5, opacity: 0.18 },
  { range: "8-14d", count: 8, opacity: 0.3 },
  { range: "14-21d", count: 10, opacity: 1, isMedian: true },
  { range: "21-28d", count: 9, opacity: 0.4 },
  { range: "28-35d", count: 6, opacity: 0.22 },
  { range: "35-42d", count: 4, opacity: 0.12 },
  { range: "42-56d", count: 2, opacity: 0.07 },
  { range: "56d+", count: 1, opacity: 0.03 },
];

// ── Expert ──

export const EXPERT_OVERVIEW = {
  reputation: 1840,
  tier: "Established" as const,
  tierProgress: 84,
  ptsToNext: 160,
  vetdBalance: 4280,
  vetdStaked: 2100,
  vetdAvailable: 2180,
  totalEarned: 12640,
  periodEarned: 1240,
  reviewsCompleted: 142,
  reviewsThisPeriod: 47,
  consensusAlignment: 92,
};

export const EXPERT_EARNINGS = [
  { label: "Review Rewards", amount: 8420, pct: 67, positive: true },
  { label: "Endorsement Payouts", amount: 3200, pct: 25, positive: true },
  { label: "Governance + Staking", amount: 1020, pct: 8, positive: true },
  { label: "Slashing Losses", amount: -120, pct: 1, positive: false },
];

export const EXPERT_REPUTATION_TIMELINE = [
  { month: "Oct", score: 380 },
  { month: "Nov", score: 620 },
  { month: "Dec", score: 880 },
  { month: "Jan", score: 1150 },
  { month: "Feb", score: 1520 },
  { month: "Mar", score: 1840 },
];

export const EXPERT_SCORE_DISTRIBUTION = [
  { range: "In IQR", count: 131, color: "primary" as const },
  { range: "1-1.5x", count: 8, color: "muted" as const },
  { range: "1.5-2x", count: 2, color: "negative" as const },
  { range: ">2x IQR", count: 1, color: "negative" as const },
];

export const EXPERT_STAKING = [
  { label: "Currently Staked", value: "2,100 $VETD", color: "primary" as const },
  { label: "Locked in Reviews (25% max)", value: "525" },
  { label: "Locked in Endorsements", value: "1,200" },
  { label: "Available to Withdraw", value: "2,180", color: "positive" as const },
  { label: "Reward Multiplier", value: "1.25x", color: "primary" as const },
];

export interface ActiveEndorsement {
  candidate: string;
  role: string;
  guild: string;
  staked: number;
  status: "hired" | "interview" | "review";
  payout?: string;
  payoutNote?: string;
  trackingDay?: number;
  trackingTotal?: number;
}

export const ACTIVE_ENDORSEMENTS: ActiveEndorsement[] = [
  { candidate: "Sarah M.", role: "Sr. Solidity Dev", guild: "Engineering", staked: 400, status: "hired", payout: "+200", payoutNote: "50% paid", trackingDay: 42, trackingTotal: 90 },
  { candidate: "Alex K.", role: "Data Engineer", guild: "Data Science", staked: 350, status: "interview" },
  { candidate: "Jamie L.", role: "Product Designer", guild: "Design", staked: 450, status: "review" },
];

export const ENDORSEMENT_SUMMARY = {
  active: 3,
  atRisk: 1200,
  successRate: 83,
  totalEarned: 3200,
};

// ── Candidate ──

export const CANDIDATE_KPIS: CompanyKPI[] = [
  { label: "Active Applications", value: "6", change: "2 new", changeDirection: "up", sparklineData: [], accentColor: "primary" },
  { label: "Expert Reviews", value: "14", change: "", changeDirection: "neutral", sparklineData: [], accentColor: "positive" },
  { label: "Profile Views", value: "89", change: "34%", changeDirection: "up", sparklineData: [], accentColor: "muted" },
  { label: "Endorsements", value: "3", change: "", changeDirection: "neutral", sparklineData: [], accentColor: "primary" },
];

export const CANDIDATE_PIPELINE = [
  { stage: "In Review", count: 2, color: "primary" as const },
  { stage: "Endorsed", count: 1, color: "primary-muted" as const },
  { stage: "Interview", count: 2, color: "muted" as const },
  { stage: "Offer", count: 1, color: "positive" as const },
];

export interface VettingScore {
  guild: string;
  score: number;
  maxScore: number;
}

export const VETTING_SCORES: VettingScore[] = [
  { guild: "Engineering", score: 88, maxScore: 100 },
  { guild: "Data Science", score: 76, maxScore: 100 },
  { guild: "Design", score: 65, maxScore: 100 },
];

export interface CandidateApplication {
  role: string;
  company: string;
  score: number | null;
  guild: string;
  endorsements: string;
  status: "offer" | "interview" | "review";
}

export const CANDIDATE_APPLICATIONS: CandidateApplication[] = [
  { role: "Sr. Solidity Developer", company: "ChainLabs Inc.", score: 88, guild: "Engineering", endorsements: "3 experts endorsed", status: "offer" },
  { role: "Backend Engineer", company: "DeFi Protocol", score: 88, guild: "Engineering", endorsements: "2 of 3 slots", status: "interview" },
  { role: "Data Pipeline Engineer", company: "Analytics DAO", score: 76, guild: "Data Science", endorsements: "1 pending", status: "interview" },
  { role: "Full Stack Developer", company: "NFT Marketplace", score: null, guild: "Engineering", endorsements: "Awaiting review", status: "review" },
  { role: "Product Designer", company: "Web3 Studio", score: 65, guild: "Design", endorsements: "Not endorsed", status: "review" },
  { role: "Smart Contract Engineer", company: "Bridge Protocol", score: null, guild: "Engineering", endorsements: "Panel assigned", status: "review" },
];

export const CANDIDATE_DISCOVERY = [
  { label: "Search Appearances", value: "312" },
  { label: "Click-Through Rate", value: "28.5%" },
  { label: "Saved by Companies", value: "7", color: "primary" as const },
  { label: "Messages Received", value: "4" },
];

export interface GuildMembership {
  guild: string;
  score: number;
  vettedDate: string;
  status: "active" | "improve";
}

export const GUILD_MEMBERSHIPS: GuildMembership[] = [
  { guild: "Engineering", score: 88, vettedDate: "Mar 2026", status: "active" },
  { guild: "Data Science", score: 76, vettedDate: "Feb 2026", status: "active" },
  { guild: "Design", score: 65, vettedDate: "Mar 2026", status: "improve" },
];

export const PROFILE_VIEWS_DATA = [
  { week: "W1", views: 4 },
  { week: "W2", views: 7 },
  { week: "W3", views: 10 },
  { week: "W4", views: 14 },
  { week: "Now", views: 15 },
];
