/**
 * Tour target identifiers used by the expert onboarding tour and the story-lab
 * driver. Each value is the literal string written to `data-tour-target` on
 * the matching DOM node so the driver can locate elements across pages.
 */
export const TOUR_TARGETS = {
  applicationCardCta: "expert-application-card-cta",
  applicationCardDeadline: "expert-application-card-deadline",
  applicationCardGuild: "expert-application-card-guild",
  applicationCardIdentity: "expert-application-card-identity",
  applicationCardLevel: "expert-application-card-level",
  applicationCardProgress: "expert-application-card-progress",
  applicationCardStatus: "expert-application-card-status",
  applicationReview: "expert-application-review",
  applicationReviewCard: "expert-application-review-card",
  applicationsAssignmentToggle: "expert-applications-assignment-toggle",
  applicationsGuildFilter: "expert-applications-guild-filter",
  applicationsOverview: "expert-applications-overview",
  applicationsQueue: "expert-applications-queue",
  applicationsSearch: "expert-applications-search",
  applicationsStats: "expert-applications-stats",
  applicationsTabs: "expert-applications-tabs",
  commitReveal: "expert-commit-reveal",
  dashboardActionPanel: "expert-dashboard-action-panel",
  dashboardGovernanceCard: "expert-dashboard-governance-card",
  dashboardGuildsSection: "expert-dashboard-guilds-section",
  dashboardNotificationsFeed: "expert-dashboard-notifications-feed",
  dashboardOverview: "expert-dashboard-overview",
  dashboardRecentActivity: "expert-dashboard-recent-activity",
  dashboardReputationStat: "expert-dashboard-reputation-stat",
  dashboardReviewQueue: "expert-dashboard-review-queue",
  dashboardStatsRow: "expert-dashboard-stats-row",
  desktopSidebar: "expert-desktop-sidebar",
  earningsChart: "expert-earnings-chart",
  earningsClaimCard: "expert-earnings-claim-card",
  earningsFilters: "expert-earnings-filters",
  earningsRewardRow: "expert-earnings-reward-row",
  earningsSummary: "expert-earnings-summary",
  earningsTimeline: "expert-earnings-timeline",
  endorsementApplicationsList: "expert-endorsement-applications-list",
  endorsementCandidateBidCta: "expert-endorsement-candidate-bid-cta",
  endorsementCandidateCard: "expert-endorsement-candidate-card",
  endorsementFilters: "expert-endorsement-filters",
  endorsementActiveList: "expert-endorsement-active-list",
  endorsementMarketplace: "expert-endorsement-marketplace",
  endorseModal: "expert-endorse-modal",
  endorseModalCandidate: "expert-endorse-modal-candidate",
  endorseSlashWarning: "expert-endorse-slash-warning",
  endorseAmountInput: "expert-endorse-amount-input",
  endorseSubmitButton: "expert-endorse-submit-button",
  navDashboard: "expert-nav-dashboard",
  navNotifications: "expert-nav-notifications",
  navApplications: "expert-nav-applications",
  navEndorsements: "expert-nav-endorsements",
  navGuilds: "expert-nav-guilds",
  navGovernance: "expert-nav-governance",
  navEarnings: "expert-nav-earnings",
  navReputation: "expert-nav-reputation",
  governanceCreateCta: "expert-governance-create-cta",
  governanceHero: "expert-governance-hero",
  governancePastSection: "expert-governance-past-section",
  governanceProposalCard: "expert-governance-proposal-card",
  governanceProposals: "expert-governance-proposals",
  governanceVoteWeight: "expert-governance-vote-weight",
  guildCardItem: "expert-guild-card",
  guildCardOpenAffordance: "expert-guild-card-open",
  guildCardStats: "expert-guild-card-stats",
  guildCardUrgentBanner: "expert-guild-card-urgent",
  guildDirectory: "expert-guild-directory",
  guildMembers: "expert-guild-members",
  guildPendingReviews: "expert-guild-pending-reviews",
  guildPostFeed: "expert-guild-post-feed",
  guildStakeWidget: "expert-guild-stake-widget",
  guildStandards: "expert-guild-standards",
  guildStartReviewing: "expert-guild-start-reviewing",
  guildYourPosition: "expert-guild-your-position",
  guildsActionRequired: "expert-guilds-action-required",
  guildsJoinCta: "expert-guilds-join-cta",
  mobileNav: "expert-mobile-nav",
  notificationResultCard: "expert-notification-result-card",
  notifications: "expert-notifications",
  notificationsActionGroup: "expert-notifications-action-group",
  notificationsEmptyState: "expert-notifications-empty-state",
  notificationsFilterTabs: "expert-notifications-filter-tabs",
  notificationsHeader: "expert-notifications-header",
  notificationsList: "expert-notifications-list",
  notificationsMarkAllRead: "expert-notifications-mark-all-read",
  onboardingChecklist: "expert-onboarding-checklist",
  practiceReviewApplicantHeader: "expert-practice-review-applicant-header",
  practiceReviewCloseButton: "expert-practice-review-close-button",
  practiceReviewCommitReveal: "expert-practice-review-commit-reveal",
  practiceReviewCriteria: "expert-practice-review-criteria",
  practiceReviewCta: "expert-practice-review-cta",
  practiceReviewDomainRubric: "expert-practice-review-domain-rubric",
  practiceReviewExpertise: "expert-practice-review-expertise",
  practiceReviewFeedback: "expert-practice-review-feedback",
  practiceReviewGeneralRubric: "expert-practice-review-general-rubric",
  practiceReviewGeneralSubtotal: "expert-practice-review-general-subtotal",
  practiceReviewInterpretationGuide: "expert-practice-review-interpretation-guide",
  practiceReviewJustification: "expert-practice-review-justification",
  practiceReviewLinks: "expert-practice-review-links",
  practiceReviewMotivation: "expert-practice-review-motivation",
  practiceReviewOverallBar: "expert-practice-review-overall-bar",
  practiceReviewOverallSummary: "expert-practice-review-overall-summary",
  practiceReviewProfile: "expert-practice-review-profile",
  practiceReviewQuestionPrompt: "expert-practice-review-question-prompt",
  practiceReviewRedFlagList: "expert-practice-review-red-flag-list",
  practiceReviewResult: "expert-practice-review-result",
  practiceReviewResume: "expert-practice-review-resume",
  practiceReviewScoreButtons: "expert-practice-review-score-buttons",
  practiceReviewScoreSummary: "expert-practice-review-score-summary",
  practiceReviewStakeInput: "expert-practice-review-stake-input",
  practiceReviewSubmitButton: "expert-practice-review-submit-button",
  practiceReviewSuccessBanner: "expert-practice-review-success-banner",
  practiceReviewTopicCard: "expert-practice-review-topic-card",
  practiceReviewTopicJustification: "expert-practice-review-topic-justification",
  practiceReviewTxConfirmed: "expert-practice-review-tx-confirmed",
  practiceReviewTxStatus: "expert-practice-review-tx-status",
  practiceReviewWhatToLookFor: "expert-practice-review-what-to-look-for",
  practiceReviewWhatsNext: "expert-practice-review-whats-next",
  reputationBreakdownCards: "expert-reputation-breakdown-cards",
  reputationDeltaRow: "expert-reputation-delta-row",
  reputationScoreChart: "expert-reputation-score-chart",
  reputationScoreHero: "expert-reputation-score-hero",
  reputationTierTower: "expert-reputation-tier-tower",
  reputationTimeline: "expert-reputation-timeline",
  reviewQueue: "expert-review-queue",
  rewardsSummary: "expert-rewards-summary",
  stakingStatus: "expert-staking-status",
} as const;

export type TourTarget = keyof typeof TOUR_TARGETS;
export type TourTargetValue = (typeof TOUR_TARGETS)[TourTarget];

/**
 * Returns the spread props to apply `data-tour-target="<value>"` to a DOM node.
 *
 * Usage: `<div {...dataTourTarget(TOUR_TARGETS.dashboardOverview)} />`
 */
export function dataTourTarget(target: TourTargetValue): {
  "data-tour-target": TourTargetValue;
} {
  return { "data-tour-target": target };
}

export type TourTargetSelector =
  `[data-tour-target="${TourTargetValue}"]`;

const NAV_TOUR_TARGET_BY_HREF: Record<string, TourTargetValue> = {
  "/expert/dashboard": TOUR_TARGETS.navDashboard,
  "/expert/notifications": TOUR_TARGETS.navNotifications,
  "/expert/voting": TOUR_TARGETS.navApplications,
  "/expert/endorsements": TOUR_TARGETS.navEndorsements,
  "/expert/guilds": TOUR_TARGETS.navGuilds,
  "/expert/governance": TOUR_TARGETS.navGovernance,
  "/expert/earnings": TOUR_TARGETS.navEarnings,
  "/expert/reputation": TOUR_TARGETS.navReputation,
};

export function getNavTourTargetForHref(href: string): TourTargetValue | undefined {
  return NAV_TOUR_TARGET_BY_HREF[href];
}

/**
 * Returns the CSS attribute selector that matches a tour target.
 */
export function tourTargetSelector(target: TourTargetValue): TourTargetSelector {
  return `[data-tour-target="${target}"]`;
}
