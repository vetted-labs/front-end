export type { Job, JobType, LocationType, JobStatus, JobSalary, DashboardStats } from "./job";
export type { Guild, GuildPublicDetail, GuildLeaderboardEntry, ExpertGuild, ExpertGuildDetail, GuildRecord, GuildOption, LeaderboardExpert, GuildEarningsOverview, ExpertRole, GuildActivity, GuildDetailData, GuildDetailTab } from "./guild";
export { GUILD_DETAIL_TABS } from "./guild";
export type { ExpertProfile, ExpertActivity, ExpertMember, ExpertStatus, PendingGuildInfo, FieldErrors } from "./expert";
export type { CandidateProfile, CandidateMember, SocialLink, CandidateRejectionFeedback } from "./candidate";
export type {
  ApplicationsTabType,
  ApplicationsFilterMode,
  CandidateApplication,
  CompanyApplication,
  GuildJobApplication,
  ApplicationStatus,
  ApplicationStats,
  StatusTransition,
} from "./application";
export type {
  GuildApplication,
  GuildApplicationSummary,
  GuildApplicationDetail,
  GuildApplicationVote,
  GuildApplicationTemplate,
  GuildApplicationQuestion,
  GuildApplicationLevel,
  GuildDomainLevel,
  GuildDomainTopic,
  VoteHistoryItem,
  GuildApplicationStatus,
  GuildApplicationOutcome,
  GuildApplicationAppeal,
  AppealVote,
  AppealOutcome,
  AppealStatus,
} from "./guildApplication";
export { mapAppealResponse } from "./guildApplication";
export type {
  Conversation,
  Message,
  MeetingDetails,
  MeetingStatus,
  MeetingResponse,
  UpcomingMeeting,
  ConversationStatus,
  MessageType,
  UnreadCounts,
} from "./messaging";
export type { PaginatedResponse, PaginationInfo } from "./pagination";
export type {
  EarningsEntry,
  GuildEarning,
  TypeEarning,
  EarningsSummary,
  TimeRange,
} from "./earnings";
export type {
  ReputationTimelineEntry,
  ReputationTierConfig,
  RewardTierName,
  RewardTier,
} from "./reputation";
export { REWARD_TIERS, getRewardTier, getRewardTierProgress } from "./reputation";
export type {
  PostTag,
  PostSortMode,
  TopTimeWindow,
  ReactionType,
  ReactionSummary,
  PollChoiceMode,
  ModerationAction,
  PostAuthor,
  GuildPost,
  GuildPostReply,
  CreatePostPayload,
  CreateReplyPayload,
  VotePayload,
  GuildFeedResponse,
  ToggleReactionPayload,
  ToggleReactionResponse,
  PollOption,
  PostPoll,
  CreatePollPayload,
  CastPollVotePayload,
  CastPollVoteResponse,
  ModerationPayload,
  FeedPrivileges,
} from "./guild-feed";
export type {
  GovernanceVote,
  GovernanceProposalDetail,
  GovernanceOutcome,
} from "./governance";
export { PROPOSAL_TYPE_LABELS } from "./governance";
export type {
  AuthResponse,
  Notification,
  NotificationUnreadCount,
  NotificationsResponse,
  StakeBalance,
  GuildStakeInfo,
  UnstakeRequest,
  StakingStats,
  WalletChallenge,
  WalletVerification,
  WalletVerifyResponse,
  TokenBalance,
  TokenInfo,
  BlockchainConfig,
  ReputationScore,
  PendingRewards,
  RewardPoolBalance,
  EndorsementStatus,
  EndorsementInfo,
  EndorsementStats,
  EndorsementApplication,
  ActiveEndorsement,
  DisputePanelMember,
  DisputeDetail,
  EarningsBreakdown,
  EarningsBreakdownResponse,
  ReputationTimeline,
  RewardDetail,
  LeaderboardEntry,
  CommitRevealPhaseStatus,
  CommitRevealHash,
  ExpertCRPhaseStatus,
  VoteEligibility,
  CompanyProfile,
  GuildMembershipCheck,
  GuildAverages,
  GuildMaster,
  CompanyActivityItem,
  CandidateGuildReport,
  GuildReportReview,
  BaseNotification,
  CompanyNotification,
  CompanyNotificationsResponse,
  CompanyNotificationPreferences,
  CandidateNotification,
  CandidateNotificationsResponse,
  CandidateNotificationPreferences,
} from "./api-responses";

// --- Shared UI types ---
export type CandidateSortOption = "endorsements" | "newest" | "oldest" | "name";

/** Applications grouped by job — used in company candidates views. */
export interface GroupedJob {
  job: import("./application").CompanyApplication["job"];
  applications: import("./application").CompanyApplication[];
}
export type {
  RubricCriterion,
  RubricQuestionEntry,
  RubricRedFlag,
  RubricInterpretationGuideItem,
  GeneralTemplateRubric,
  TopicScoringGuide,
  QuestionPart,
  GeneralReviewTemplate,
  GeneralReviewQuestion,
  LevelReviewTemplate,
  ReviewDomainTopic,
  ApplicationResponses,
  ReviewSubmitPayload,
  ReviewSubmitResponse,
} from "./rubric";
export type { TeamMember, TeamMemberRole, TeamMemberStatus } from "./team";
export type { ExpertMembershipApplication, CandidateGuildApplication, MyReviewData, ExpertApplicationFinalization, ReviewModalApplication, ReviewGuildApplicationModalProps } from "./review";
