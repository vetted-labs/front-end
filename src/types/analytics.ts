// ── Expert Analytics Types ────────────────────────────────────────

export interface EarningsItem {
  label: string;
  amount: number;
  pct: number;
  positive: boolean;
}

export interface ExpertOverviewData {
  reputation: number;
  tier: string;
  tierProgress: number;
  ptsToNext: number;
  vetdBalance: number;
  vetdStaked: number;
  vetdAvailable: number;
  totalEarned: number;
  periodEarned: number;
  reviewsCompleted: number;
  reviewsThisPeriod: number;
  consensusAlignment: number;
  earnings: EarningsItem[];
}

export interface ReputationPoint {
  label: string;
  value: number;
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
  opacity: number;
  isMedian: boolean;
}

export interface StakingItem {
  label: string;
  value: string;
  color: "primary" | "positive";
}

export interface ReviewsData {
  consensusTimeline: { label: string; value: number }[];
  scoreDistribution: ScoreDistributionItem[];
  staking: StakingItem[];
}

export interface AnalyticsEndorsement {
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

export interface EndorsementStatsData {
  active: number;
  atRisk: number;
  successRate: number;
  totalEarned: number;
  successRateNote: string;
  endorsements: AnalyticsEndorsement[];
}

// ── Company Analytics Types ──────────────────────────────────────

export interface CompanyKPIData {
  label: string;
  value: string;
  change: string;
  changeDirection: "up" | "down" | "neutral";
  unit?: string;
  sparklineData: number[];
  accentColor: "primary" | "positive" | "muted";
}

export interface CompanyOverviewData {
  kpis: CompanyKPIData[];
  applicationsOverTime: { label: string; apps: number; hires: number }[];
}

export interface CompanyFunnelStage {
  label: string;
  count: number;
  pct: string;
  conversionLabel?: string;
  isHired?: boolean;
}

export interface CompanySourceData {
  label: string;
  pct: number;
  hireRate?: string;
}

export interface CompanyGuildDistribution {
  name: string;
  count: number;
  pct: string;
}

export interface CompanyPipelineData {
  funnelStages: CompanyFunnelStage[];
  sources: CompanySourceData[];
  hireRateBySource?: { endorsed?: string; guild?: string; direct?: string };
  heatmap: number[][];
  heatmapRows: string[];
  heatmapCols: string[];
  heatmapPeak?: string;
  guildDistribution: CompanyGuildDistribution[];
  guildTotal: number;
}

export interface CompanyJobPerformance {
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

export interface CompanyTimeToHireBar {
  range: string;
  count: number;
  opacity: number;
  isMedian?: boolean;
}

export interface CompanyTimeToHireStats {
  median?: string;
  fastest?: { value: string; role: string };
  slowest?: { value: string; role: string };
  industryAvg?: string;
  comparisonNote?: string;
}

export interface CompanyJobsData {
  jobs: CompanyJobPerformance[];
  timeToHireDistribution: CompanyTimeToHireBar[];
  timeToHireStats: CompanyTimeToHireStats;
}

// ── Candidate Analytics Types ────────────────────────────────────

export interface CandidateKPIData {
  label: string;
  value: string;
  change: string;
  changeDirection: "up" | "down" | "neutral";
  sparklineData: number[];
  accentColor: "primary" | "positive" | "muted";
}

export interface CandidatePipelineStage {
  stage: string;
  count: number;
  color: "primary" | "primary-muted" | "muted" | "positive";
}

export interface CandidateVettingScore {
  guild: string;
  score: number;
  maxScore: number;
}

export interface CandidateOverviewData {
  kpis: CandidateKPIData[];
  pipeline: CandidatePipelineStage[];
  vettingScores: CandidateVettingScore[];
}

export interface CandidateApplicationItem {
  role: string;
  company: string;
  score: number | null;
  guild: string;
  endorsements: string;
  status: "offer" | "interview" | "review";
}

export interface CandidateDiscoveryMetric {
  label: string;
  value: string;
  color?: "primary" | "muted";
}

export interface CandidateGuildMembership {
  guild: string;
  score: number;
  vettedDate: string;
  status: "active" | "improve";
}

export interface CandidateVisibilityData {
  profileViews: { label: string; value: number }[];
  totalViews: number;
  viewsChange?: string;
  discovery: CandidateDiscoveryMetric[];
  guildMemberships: CandidateGuildMembership[];
}
