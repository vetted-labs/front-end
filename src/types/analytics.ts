// ── Job Analytics Detail (Pilot) ──────────────────────────────────
// Mirrors the backend `analytics-job-detail-v1` contract.
// Source: docs/superpowers/plans/2026-04-29-analytics-pilot.md:231-326

export type AnalyticsAlignmentState =
  | "included"
  | "dissenting"
  | "neutral"
  | "tiebreaker_required"
  | "unknown";

export type AnalyticsScoreStatus =
  | "scored"
  | "not_scored"
  | "insufficient_reviews"
  | "tiebreaker_required"
  | "criteria_unavailable";

export type AnalyticsBidOutcome = "selected" | "returned" | "active" | "unknown";

export interface AnalyticsCriterionScore {
  criterionId: string;
  label: string;
  averageScore: number | null;
  maxScore: number;
  scoreStatus: "scored" | "missing" | "not_persisted";
  source: "proposal_vote" | "guild_application_review" | "fixture" | "unavailable";
}

export interface AnalyticsReviewCriterionScore {
  criterionId: string;
  label: string;
  score: number;
  maxScore: number;
  evidence: string | null;
}

export interface AnalyticsReview {
  reviewId: string;
  source: "proposal_vote" | "guild_application_review";
  expertId: string;
  publicName: string;
  score: number | null;
  vote: "for" | "against" | "abstain" | "approve" | "reject" | null;
  contributedToConsensus: boolean | null;
  alignmentState: AnalyticsAlignmentState;
  alignmentDistance: number | null;
  slashingTier: string | null;
  feedback: string | null;
  criteriaScores: AnalyticsReviewCriterionScore[] | null;
  createdAt: string;
}

export interface AnalyticsBid {
  bidId: string;
  expertId: string | null;
  publicName: string;
  amount: string;
  refundAmount: string;
  rank: number | null;
  outcome: AnalyticsBidOutcome;
  placedAt: string | null;
}

export interface AnalyticsCandidate {
  id: string;
  source: "application" | "proposal" | "guild_application";
  applicationId: string | null;
  guildApplicationId: string | null;
  proposalId: string | null;
  candidateId: string;
  name: string;
  headline: string | null;
  appliedAt: string | null;
  applicationStatus:
    | "pending"
    | "reviewing"
    | "interviewed"
    | "accepted"
    | "rejected"
    | null;
  analyticsStatus:
    | "endorsed"
    | "vetted_only"
    | "reviewing"
    | "rejected"
    | "accepted"
    | "needs_tiebreaker"
    | "not_started";
  vettingScore: number | null;
  scoreStatus: AnalyticsScoreStatus;
  consensus: {
    finalScore: number | null;
    state:
      | "finalized"
      | "not_started"
      | "in_progress"
      | "insufficient_reviews"
      | "tiebreaker_required"
      | "failed";
    algorithmVersion: string | null;
    minReviewsRequired: number;
    completedReviews: number;
    tiebreakerRequired: boolean;
    finalizedAt: string | null;
  };
  reviewerCount: number;
  selectedEndorserCount: number;
  selectedEndorsementAmount: string;
  totalBidAmount: string;
  criteriaScores: AnalyticsCriterionScore[];
  reviews: AnalyticsReview[];
  bids: AnalyticsBid[];
}

export interface AnalyticsCriteriaAverage {
  criterionId: string;
  label: string;
  averageScore: number;
  maxScore: number;
  candidateCount: number;
}

export interface AnalyticsCriteriaDistribution {
  criterionId: string;
  label: string;
  buckets: Array<{ label: string; count: number }>;
}

export interface AnalyticsEndorsementCorrelation {
  status: "available" | "insufficient_data";
  message: string | null;
  items: Array<{ criterionId: string; label: string; correlation: number }>;
}

export interface AnalyticsDisagreement {
  status: "available" | "insufficient_data" | "alignment_unavailable";
  flags: Array<{
    candidateRowId: string;
    candidateId: string;
    candidateName: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

export interface AnalyticsOutcomeReadiness {
  requiredHireOutcomes: number;
  trackedHireOutcomes: number;
  unlocked: boolean;
}

export interface AnalyticsInsights {
  criteriaAverages: AnalyticsCriteriaAverage[];
  criteriaDistributions: AnalyticsCriteriaDistribution[];
  endorsementCorrelation: AnalyticsEndorsementCorrelation;
  disagreement: AnalyticsDisagreement;
  outcomeReadiness: AnalyticsOutcomeReadiness;
}

export interface JobAnalyticsDetail {
  contractVersion: "analytics-job-detail-v1";
  job: {
    id: string;
    title: string;
    guild: string | null;
    status: string;
    createdAt: string;
  };
  summary: {
    totalCandidates: number;
    endorsedCandidates: number;
    vettedOnlyCandidates: number;
    rejectedCandidates: number;
    acceptedCandidates: number;
    trackedHireOutcomes: number;
    requiredHireOutcomes: number;
    prescriptiveUnlocked: boolean;
  };
  candidates: AnalyticsCandidate[];
  insights: AnalyticsInsights;
}

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
